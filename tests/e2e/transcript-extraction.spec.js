import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * E2E Tests for Transcript Control Extension
 *
 * These tests verify the core functionality:
 * 1. Control button appears in YouTube player
 * 2. Clicking button extracts transcript to clipboard
 * 3. Transcript format is correct (timestamped lines)
 *
 * Test video: Uses a known YouTube video with captions
 */

// YouTube video known to have captions (TED talk - reliable)
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=8S0FDjFBj8o';

// Extension path for loading
const EXTENSION_PATH = path.resolve('./');

/**
 * Create a browser context with the extension loaded
 * Uses launchPersistentContext which is required for Chrome extensions
 */
async function createExtensionContext() {
  // Create a temporary user data directory for the browser
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transcript-test-'));

  // Launch with persistent context - required for extensions
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Extensions require headed mode
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
    ],
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  return { context, userDataDir };
}

test.describe('Transcript Control Extension', () => {
  test.describe.configure({ mode: 'serial' });

  let context;
  let userDataDir;
  let page;

  test.beforeAll(async () => {
    const setup = await createExtensionContext();
    context = setup.context;
    userDataDir = setup.userDataDir;
  });

  test.afterAll(async () => {
    await context?.close();
    // Clean up temp directory
    if (userDataDir) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test.beforeEach(async () => {
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('control button appears in YouTube player controls', async () => {
    // Collect console messages for debugging
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (text.includes('[TranscriptControl')) {
        console.log('EXTENSION:', text);
      }
    });

    // Navigate to YouTube video
    await page.goto(TEST_VIDEO_URL);

    // Wait for video player to load
    await page.waitForSelector('.ytp-right-controls', { timeout: 30000 });

    // Give extension time to inject
    await page.waitForTimeout(3000);

    // Log all TranscriptControl messages for debugging
    const extensionLogs = consoleMessages.filter(m => m.includes('[TranscriptControl'));
    console.log('Extension logs collected:', extensionLogs.length);
    extensionLogs.forEach(msg => console.log(msg));

    // Wait for our extension button to appear using locator
    const controlButton = page.locator('[data-transcript-control]');
    await expect(controlButton).toBeVisible({ timeout: 10000 });

    // Verify button has correct aria-label
    const ariaLabel = await controlButton.getAttribute('aria-label');
    expect(ariaLabel).toBe('Copy transcript');
  });

  test('clicking button copies transcript to clipboard', async () => {
    // Navigate to YouTube video
    await page.goto(TEST_VIDEO_URL);

    // Wait for extension button
    const controlButton = await page.waitForSelector('[data-transcript-control]', {
      timeout: 15000,
    });

    // Clear clipboard first
    await page.evaluate(() => navigator.clipboard.writeText(''));

    // Click the transcript button
    await controlButton.click();

    // Wait for clipboard operation (transcript fetch + clipboard write)
    // The extension has a 15s timeout, so we wait generously
    await page.waitForTimeout(5000);

    // Read clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

    // Verify clipboard is not empty
    expect(clipboardText).toBeTruthy();
    expect(clipboardText.length).toBeGreaterThan(0);

    // Verify transcript format: should have timestamped lines like [MM:SS] text
    const lines = clipboardText.split('\n');
    expect(lines.length).toBeGreaterThan(1);

    // Check first line has timestamp format
    const timestampRegex = /^\[(\d{1,2}:)?\d{2}:\d{2}\]/;
    expect(lines[0]).toMatch(timestampRegex);
  });

  test('transcript contains expected content structure', async () => {
    // Navigate to YouTube video
    await page.goto(TEST_VIDEO_URL);

    // Wait for extension button
    const controlButton = await page.waitForSelector('[data-transcript-control]', {
      timeout: 15000,
    });

    // Click to copy transcript
    await controlButton.click();

    // Wait for operation
    await page.waitForTimeout(5000);

    // Read clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

    // Parse transcript lines
    const lines = clipboardText.split('\n').filter(line => line.trim());

    // Verify multiple timestamped entries
    const timestampedLines = lines.filter(line => /^\[\d/.test(line));
    expect(timestampedLines.length).toBeGreaterThan(10);

    // Verify timestamps are in ascending order
    const timestamps = timestampedLines.map(line => {
      const match = line.match(/^\[(\d{1,2}:)?(\d{2}):(\d{2})\]/);
      if (!match) return 0;
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    });

    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  test('extension provides debugging output in console', async () => {
    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[TranscriptControl')) {
        consoleMessages.push(text);
      }
    });

    // Navigate to YouTube video
    await page.goto(TEST_VIDEO_URL);

    // Wait for extension button
    const controlButton = page.locator('[data-transcript-control]');
    await expect(controlButton).toBeVisible({ timeout: 15000 });

    // Click button
    await controlButton.click();

    // Wait for operation
    await page.waitForTimeout(5000);

    // Verify debug messages were logged
    expect(consoleMessages.length).toBeGreaterThan(0);

    // Check for key debug messages indicating successful initialization
    const hasContentInit = consoleMessages.some(msg =>
      msg.includes('Content script initializing') || msg.includes('init() called')
    );
    const hasTranscriptModule = consoleMessages.some(msg =>
      msg.includes('Transcript module loaded')
    );
    expect(hasContentInit).toBe(true);
    expect(hasTranscriptModule).toBe(true);
  });
});

test.describe('Edge Cases', () => {
  let context;
  let userDataDir;
  let page;

  test.beforeAll(async () => {
    const setup = await createExtensionContext();
    context = setup.context;
    userDataDir = setup.userDataDir;
  });

  test.afterAll(async () => {
    await context?.close();
    // Clean up temp directory
    if (userDataDir) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test.beforeEach(async () => {
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('button does not appear on non-video pages', async () => {
    // Navigate to YouTube homepage
    await page.goto('https://www.youtube.com/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Button should NOT appear
    const controlButton = await page.$('[data-transcript-control]');
    expect(controlButton).toBeNull();
  });

  test('handles SPA navigation correctly', async () => {
    // Navigate to a video
    await page.goto(TEST_VIDEO_URL);

    // Wait for button
    await page.waitForSelector('[data-transcript-control]', { timeout: 15000 });

    // Navigate to another video via YouTube's SPA
    await page.evaluate(() => {
      // Find any related video link and click it
      const relatedVideo = document.querySelector('ytd-compact-video-renderer a');
      if (relatedVideo) {
        relatedVideo.click();
      }
    });

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Button should still appear on new video
    const controlButton = await page.waitForSelector('[data-transcript-control]', {
      timeout: 15000,
    });
    expect(controlButton).toBeTruthy();
  });
});
