import fs from 'fs'
import path from 'path'
import { CarIndexer, CarReader } from '@ipld/car'

export interface FileEntity {
  pieceCID: string
  fileSize: number
  pieceSize: number
  dataCID: string
}

export const getCarFiles = (dir: string): string[] => {
  // List all items in the directory
  const items = fs.readdirSync(dir);

  const carFiles: string[] = [];

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    // If directory, recurse. Otherwise, check if it's a .car file.
    if (stat.isDirectory()) {
      carFiles.push(...getCarFiles(fullPath));
    } else if (path.extname(item) === '.car') {
      carFiles.push(fullPath);
    }
  }

  return carFiles;
};

const extractSingleFile = async (file: string): Promise<FileEntity> => {
  console.log(`Extracting: ${file}`);
  const pieceCID = path.basename(file, '.car')
  const inStream = fs.createReadStream(file);
  const stats = fs.statSync(file);
  const reader = await CarReader.fromIterable(inStream);
  const roots = await reader.getRoots();
  const cid = roots[0].toString();

  return {
    pieceCID,
    fileSize: stats.size,
    pieceSize: 34359738368,
    dataCID: cid,
  };
}

export async function extractCarFiles(carFiles: string[], chunkSize = 20): Promise<Array<FileEntity>> {
  const results: FileEntity[] = [];

  for (let i = 0; i < carFiles.length; i += chunkSize) {
    const currentChunk = carFiles.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(currentChunk.map(extractSingleFile));
    results.push(...chunkResults);
  }

  return results;
}

export async function writeDataToCSV(data: Array<FileEntity>, outputPath: string) {
  let csvContent = '';

  for (const item of data) {
    csvContent += `${item.pieceCID},${item.fileSize},${item.pieceSize},${item.dataCID}\n`;
  }

  fs.writeFileSync(outputPath, csvContent);
}


const args = process.argv.slice(2); // 前两个值是 node 的路径和脚本的路径

if (args.length < 2) {
  console.error('Please provide the carPath and outputFile as arguments.');
  process.exit(1);
}

const carPath = path.resolve(args[0]);
const outputFile = path.resolve(args[1]);
const carFiles = getCarFiles(carPath); // Assuming getCarFiles is defined elsewhere in your code

extractCarFiles(carFiles).then(data => {
  return writeDataToCSV(data, outputFile)
}).then(() => {
  console.log(`${outputFile} written successfully!`);
}).catch(error => {
  console.error('An error occurred:', error);
})
