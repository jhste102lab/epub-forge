import { strFromU8, unzip } from 'fflate';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';

test('happy path: drop .txt file → download valid EPUB', async ({ page }) => {
  // Create a temporary .txt file with known Korean content.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-forge-e2e-'));
  const txtPath = path.join(tmpDir, '테스트_소설.txt');
  fs.writeFileSync(
    txtPath,
    '제1장 서론\n\n이것은 테스트 소설입니다.\n브라우저 안에서 EPUB으로 변환됩니다.\n\n제2장 결론\n\n이야기가 끝났습니다.',
    'utf8',
  );

  try {
    await page.goto('/');

    // Set the hidden file input inside .dropzone.
    const fileInput = page.locator('.dropzone input[type="file"]');
    await fileInput.setInputFiles(txtPath);

    // A Book row appears for the dropped file; its per-Book download button
    // (language-agnostic selector) converts that Book and downloads on click.
    const downloadButton = page.locator('.book-row__actions .button:not(.button--ghost)').first();
    await expect(downloadButton).toBeVisible({ timeout: 30_000 });

    // Capture the download triggered by clicking the button.
    const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);

    // Assert the suggested filename ends with .epub.
    expect(download.suggestedFilename()).toMatch(/\.epub$/);

    // Save and verify the file is non-empty.
    const downloadPath = path.join(tmpDir, download.suggestedFilename());
    await download.saveAs(downloadPath);

    const fileBuffer = fs.readFileSync(downloadPath);
    expect(fileBuffer.byteLength).toBeGreaterThan(0);

    // Unzip and verify the EPUB mimetype entry is correct.
    const bytes = new Uint8Array(fileBuffer);
    await new Promise<void>((resolve, reject) => {
      unzip(bytes, (err, unzipped) => {
        if (err !== null) {
          reject(err);
          return;
        }
        const mimetypeEntry = unzipped['mimetype'];
        expect(mimetypeEntry).toBeDefined();
        expect(strFromU8(mimetypeEntry)).toBe('application/epub+zip');

        // The font was subset + embedded entirely in the browser worker.
        const embeddedFont = unzipped['OEBPS/fonts/body.otf'];
        expect(embeddedFont).toBeDefined();
        expect(embeddedFont.byteLength).toBeGreaterThan(0);
        expect(strFromU8(unzipped['OEBPS/style.css'])).toContain('@font-face');

        // A cover was auto-generated (canvas) in the browser and embedded.
        const cover = unzipped['OEBPS/cover.png'];
        expect(cover).toBeDefined();
        expect(cover.byteLength).toBeGreaterThan(0);
        expect(strFromU8(unzipped['OEBPS/content.opf'])).toContain('properties="cover-image"');
        resolve();
      });
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
