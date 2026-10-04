import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { expandFiles } from './expandFiles';

const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8ioAAAAASUVORK5CYII=',
  ),
  (c) => c.charCodeAt(0),
);

describe('expandFiles', () => {
  it('keeps image ZIP boundaries alongside extracted and plain documents', async () => {
    const first = zipSync({ 'page10.png': png, 'page1.png': png });
    const second = zipSync({ 'page1.png': png });
    const documents = zipSync({ 'folder/book.txt': strToU8('Document text.') });
    const { files, skipped } = await expandFiles([
      new File([first], '01.zip'),
      new File([second], '02.zip'),
      new File([documents], 'documents.zip'),
      new File(['Plain text.'], 'plain.txt'),
    ]);
    expect(files.map((file) => [file.kind, file.name])).toEqual([
      ['image-zip', '01.zip'],
      ['image-zip', '02.zip'],
      ['document', 'folder/book.txt'],
      ['document', 'plain.txt'],
    ]);
    expect(files[0].bytes).toEqual(first);
    expect(files[1].bytes).toEqual(second);
    expect(skipped).toEqual([]);
  });

  it('reports a failed archive without discarding other sources in the intake', async () => {
    const { files, skipped } = await expandFiles([
      new File([new Uint8Array([1, 2, 3])], 'corrupt.zip'),
      new File([zipSync({})], 'empty.zip'),
      new File([zipSync({ 'page.png': png })], 'valid.zip'),
    ]);
    expect(files.map((file) => file.name)).toEqual(['valid.zip']);
    expect(skipped).toHaveLength(2);
    expect(skipped[0]).toContain('corrupt.zip:');
    expect(skipped[1]).toContain('empty.zip');
  });
});
