import { Score } from "../models/Score"

export const demoScore: Score = {
    bpm: 120,
    timeSignature: { beats: 4, beatValue: 4 },
    measures: [
        {
            index: 0,
            notes: [
                { pitch: "E4", string: 1, fret: 0, start: 0, duration: 1 },
                { pitch: "B3", string: 2, fret: 0, start: 0, duration: 1 },
                { pitch: "G4", string: 1, fret: 3, start: 1, duration: 1 },
                { pitch: "D3", string: 3, fret: 2, start: 1, duration: 1 },
                { pitch: "A4", string: 1, fret: 5, start: 2, duration: 1 },
                { pitch: "E4", string: 1, fret: 0, start: 3, duration: 1 },
            ],
            tabNotes: [
                { string: 1, fret: 0, beat: 0 },
                { string: 2, fret: 0, beat: 0 },
                { string: 1, fret: 3, beat: 1 },
                { string: 3, fret: 2, beat: 1 },
                { string: 1, fret: 5, beat: 2 },
                { string: 1, fret: 0, beat: 3 },
            ]
        },
        {
            index: 1,
            notes: [
                { pitch: "G3", string: 3, fret: 0, start: 0, duration: 1 },
                { pitch: "A3", string: 3, fret: 2, start: 1, duration: 1 },
                { pitch: "B3", string: 2, fret: 0, start: 2, duration: 1 },
                { pitch: "E4", string: 1, fret: 0, start: 3, duration: 1 },
            ],
            tabNotes: [
                { string: 3, fret: 0, beat: 0 },
                { string: 3, fret: 2, beat: 1 },
                { string: 2, fret: 0, beat: 2 },
                { string: 1, fret: 0, beat: 3 },
            ]
        },
        {
            index: 2,
            notes: [
                { pitch: "E2", string: 6, fret: 0, start: 0, duration: 2 },
                { pitch: "B3", string: 2, fret: 0, start: 0, duration: 2 },
                { pitch: "G3", string: 3, fret: 0, start: 0, duration: 2 },
                { pitch: "A2", string: 5, fret: 0, start: 2, duration: 2 },
                { pitch: "E4", string: 1, fret: 0, start: 2, duration: 2 },
            ],
            tabNotes: [
                { string: 6, fret: 0, beat: 0 },
                { string: 3, fret: 0, beat: 0 },
                { string: 2, fret: 0, beat: 0 },
                { string: 5, fret: 0, beat: 2 },
                { string: 1, fret: 0, beat: 2 },
            ]
        },
        {
            index: 3,
            notes: [],
            tabNotes: []
        }
    ]
}
