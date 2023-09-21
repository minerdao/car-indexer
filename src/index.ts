import fs from 'fs'
import path from 'path'
import { CarReader } from '@ipld/car'

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

export async function extractCarFiles(carFiles: string[]): Promise<Array<FileEntity>> {
  const results: Array<FileEntity> = [];

  for (const file of carFiles) {
    console.log(`Extracting: ${file}`);
    const pieceCID = path.basename(file, '.car')
    const inStream = fs.createReadStream(file);
    const stats = fs.statSync(file);
    const reader = await CarReader.fromIterable(inStream);
    const roots = await reader.getRoots();
    const cid = roots[0].toString();

    results.push({
      pieceCID,
      fileSize: stats.size,
      pieceSize: 34359738368,
      dataCID: cid,
    });
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

const carPath = '/Users/max/data/car/'
const outputFile = '/Users/max/data/output.csv'
const carFiles = getCarFiles(carPath); // Assuming getCarFiles is defined elsewhere in your code

extractCarFiles(carFiles).then(data => {
  return writeDataToCSV(data, outputFile)
}).then(() => {
  console.log(`${outputFile} written successfully!`);
}).catch(error => {
  console.error('An error occurred:', error);
})