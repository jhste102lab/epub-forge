import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ locale: 'en-US', permissions: ['clipboard-read', 'clipboard-write'] });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.dropzone input[type="file"]').setInputFiles([
    { name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('First book.') },
    { name: 'second.txt', mimeType: 'text/plain', buffer: Buffer.from('Second book.') },
  ]);
  await expect(page.locator('.book-row')).toHaveCount(2);
});

async function imageFile(page: Page, color: string) {
  const base64 = await page.evaluate((fill) => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 36;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
  }, color);
  return { name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

async function dropFiles(
  target: Locator,
  files: readonly { name: string; mimeType: string; buffer: Buffer }[],
) {
  return target.evaluate(
    (element, input) => {
      const dataTransfer = new DataTransfer();
      for (const file of input) {
        dataTransfer.items.add(
          new File([new Uint8Array(file.bytes)], file.name, { type: file.type }),
        );
      }
      const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    },
    files.map((file) => ({ name: file.name, type: file.mimeType, bytes: Array.from(file.buffer) })),
  );
}

test('cover input remains row-local and preserves text paste', async ({ page }) => {
  const first = page.locator('.book-row').nth(0);
  const second = page.locator('.book-row').nth(1);
  const red = await imageFile(page, '#ff0000');
  const green = await imageFile(page, '#00ff00');
  const blue = await imageFile(page, '#0000ff');

  const chooser = page.waitForEvent('filechooser');
  await first.locator('.cover-thumb').click();
  await (await chooser).setFiles(red);
  await expect(first.locator('.cover-thumb img')).toBeVisible();
  const firstPreview = await first
    .locator('.cover-thumb img')
    .evaluate((image: HTMLImageElement) => image.src);

  await second.locator('.cover-thumb').dispatchEvent('dragover', {
    dataTransfer: await page.evaluateHandle(() => new DataTransfer()),
  });
  await expect(second.locator('.cover-thumb')).toHaveClass(/cover-thumb--active/);
  expect(await dropFiles(second.locator('.cover-thumb'), [green])).toBe(true);
  await expect(second.locator('.cover-thumb img')).toBeVisible();
  await expect(second.locator('.cover-thumb')).not.toHaveClass(/cover-thumb--active/);
  const droppedPreview = await second
    .locator('.cover-thumb img')
    .evaluate((image: HTMLImageElement) => image.src);
  await expect(first.locator('.cover-thumb img')).toHaveAttribute('src', firstPreview);
  await expect(page.locator('.book-row')).toHaveCount(2);

  await page.evaluate(async (bytes) => {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': new Blob([new Uint8Array(bytes)], { type: 'image/png' }) }),
    ]);
  }, Array.from(blue.buffer));
  await second.locator('.cover-thumb').focus();
  await page.keyboard.press('ControlOrMeta+V');
  await expect(second.locator('.cover-thumb img')).not.toHaveAttribute('src', droppedPreview);
  await expect(first.locator('.cover-thumb img')).toHaveAttribute('src', firstPreview);
  const pastedPreview = await second
    .locator('.cover-thumb img')
    .evaluate((image: HTMLImageElement) => image.src);

  for (const [label, text] of [
    ['Title', 'Pasted title'],
    ['Author', 'Pasted author'],
  ] as const) {
    await page.evaluate((value) => navigator.clipboard.writeText(value), text);
    await second.getByLabel(label, { exact: true }).fill('');
    await second.getByLabel(label, { exact: true }).focus();
    await page.keyboard.press('ControlOrMeta+V');
    await expect(second.getByLabel(label, { exact: true })).toHaveValue(text);
    await expect(second.locator('.cover-thumb img')).toHaveAttribute('src', pastedPreview);
  }

  const imageUrl = 'https://example.invalid/cover.png';
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url() === imageUrl) remoteRequests.push(request.url());
  });
  await page.evaluate((value) => navigator.clipboard.writeText(value), imageUrl);
  await second.locator('.cover-thumb').focus();
  await page.keyboard.press('ControlOrMeta+V');
  await expect(second.locator('.cover-thumb img')).toHaveAttribute('src', pastedPreview);
  await expect(second.getByRole('alert')).toHaveCount(0);
  const urlDropPrevented = await second.locator('.cover-thumb').evaluate((element, url) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/uri-list', url);
    const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }, imageUrl);
  expect(urlDropPrevented).toBe(true);
  await expect(second.getByRole('alert')).toBeVisible();
  await expect(second.locator('.cover-thumb img')).toHaveAttribute('src', pastedPreview);
  expect(remoteRequests).toEqual([]);

  await first.getByRole('button', { name: 'Remove cover', exact: true }).click();
  await expect(first.locator('.cover-thumb img')).toHaveCount(0);
  await first.locator('input[type="file"]').setInputFiles(red);
  await expect(first.locator('.cover-thumb img')).toBeVisible();
  await expect(first.locator('input[type="file"]')).toHaveValue('');
});

test('invalid cover input preserves the current cover', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const row = page.locator('.book-row').first();
  const image = await imageFile(page, '#ff0000');
  await row.locator('input[type="file"]').setInputFiles(image);
  await expect(row.locator('.cover-thumb img')).toBeVisible();
  const preview = await row
    .locator('.cover-thumb img')
    .evaluate((image: HTMLImageElement) => image.src);

  await dropFiles(row.locator('.cover-thumb'), [image, image]);
  await expect(row.getByRole('alert')).toBeVisible();
  await expect(row.locator('.cover-thumb img')).toHaveAttribute('src', preview);

  await dropFiles(row.locator('.cover-thumb'), [
    { name: 'cover.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') },
  ]);
  await expect(row.getByRole('alert')).toBeVisible();
  await expect(row.locator('.cover-thumb img')).toHaveAttribute('src', preview);

  await dropFiles(row.locator('.cover-thumb'), [
    { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not PNG bytes') },
  ]);
  await expect(row.getByRole('alert')).toBeVisible();
  await expect(row.locator('.cover-thumb img')).toHaveAttribute('src', preview);

  await row.locator('input[type="file"]').setInputFiles(image);
  await expect(row.getByRole('alert')).toHaveCount(0);
  await expect(row.locator('.cover-thumb img')).not.toHaveAttribute('src', preview);
  expect(pageErrors).toEqual([]);
});
