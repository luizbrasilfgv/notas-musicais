const { Chord, Note } = require('@tonaljs/tonal');

function obterNotasDoAcorde(cifra, inversao = 0) {
  if (!cifra) return [];
  const chord = Chord.get(cifra);
  if (chord.empty) return [];
  
  let notes = chord.notes;
  inversao = inversao % notes.length;
  if (inversao > 0) {
    notes = [...notes.slice(inversao), ...notes.slice(0, inversao)];
  }
  
  let octave = 4;
  let result = [];
  let lastMidi = -1;
  
  for (let i = 0; i < notes.length; i++) {
    let noteName = notes[i] + octave;
    let midi = Note.midi(noteName);
    
    if (i > 0 && midi <= lastMidi) {
      octave++;
      noteName = notes[i] + octave;
      midi = Note.midi(noteName);
    }
    result.push(noteName);
    lastMidi = midi;
  }
  
  return result;
}

console.log("C#m:", obterNotasDoAcorde("C#m"));
console.log("D7:", obterNotasDoAcorde("D7"));
