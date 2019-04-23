if (process.argv[2] === undefined) {
  console.log('Запуск: node app.js <n>');
  process.exit();
}

const n = parseInt(process.argv[2], 10);

if (isNaN(n)) {
  console.log('n не является числом');
  process.exit();
}

if (n <= 0) {
  console.log('n должно быть положительным');
  process.exit();
}

const order = 2 * n - 1;

function random() {
  return Math.floor(Math.random() * 10);
}

const matrix = Array.from(Array(order), () => Array.from(Array(order), random));

matrix.forEach((row) => console.log(row.join(' ')));

let result = [];
let currentRow = -1;
let currentColumn = -1;
let minRow = 0;
let minColumn = 0;
let maxRow = order - 1;
let maxColumn = order - 1;

while (minColumn < maxColumn) {
  currentRow = minRow;
  for (currentColumn = minColumn; currentColumn < maxColumn; currentColumn++) {
    result.unshift(matrix[currentRow][currentColumn]);
  }

  maxColumn--;

  for (; currentRow < maxRow; currentRow++) {
    result.unshift(matrix[currentRow][currentColumn]);
  }

  maxRow--;

  for (; currentColumn > minColumn; currentColumn--) {
    result.unshift(matrix[currentRow][currentColumn]);
  }

  minColumn++;

  for (; currentRow > minRow; currentRow--) {
    result.unshift(matrix[currentRow][currentColumn]);
  }

  minRow++;
}

result.unshift(matrix[currentRow + 1][currentColumn + 1]);

console.log();
console.log(result.join(' '));
