import type { FileEntry } from '../types.ts'
import fs from 'fs'
import { createDirectoryEncoderStream, CAREncoderStream } from 'ipfs-car'
import { dirData } from 'utils.ts'

export const packCAR = async (files: FileEntry[]) => {
  const blocks: any[] = [];
  await createDirectoryEncoderStream(files)
  .pipeTo(
    new WritableStream({
      write(block) {
        console.log('block: ', block);
        blocks.push(block);
      },
    }),
  );

  const rootCID = blocks.at(-1)!.cid;
  const chunks: Uint8Array[] = [];
  await new ReadableStream({
    pull(controller) {
      if (blocks.length) {
        controller.enqueue(blocks.shift());
      } else {
        controller.close();
      }
    },
  })
    .pipeThrough(new CAREncoderStream([rootCID]))
    .pipeTo(
      new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
      }),
    );
  return { cid: rootCID.toString(), chunks };
}

const writeBufferToFile = (buffer: Buffer, filePath: string): void => {
  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`File saved to ${filePath}`);
    }
  });
};

const folder = '/Users/max/data/datacap/1711/json'
const carFile = `/Users/max/data/car/my.car`
const [total, files] = await dirData(folder)
const {cid, chunks} = await packCAR(files)
console.log(`Total ${total} files, cid: ${cid}`);

const concatenatedBuffer = Buffer.concat(chunks.map(array => Buffer.from(array)));
writeBufferToFile(concatenatedBuffer, carFile)
