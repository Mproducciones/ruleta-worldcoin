// utils.js
export function generateColors(numSlices = 12) {
  const baseColors = ["#ff0000", "#0000ff", "#ffffff"];
  const result = [];

  for (let i = 0; i < numSlices; i++) {
    let color;
    do {
      color = baseColors[Math.floor(Math.random() * baseColors.length)];
    } while (result[result.length - 1] === color); // evita repetir color seguido
    result.push(color);
  }

  // asegurar que el último no sea igual al primero
  if (result[0] === result[result.length - 1]) {
    result[result.length - 1] = baseColors.find(c => c !== result[0]);
  }

  return result;
}

