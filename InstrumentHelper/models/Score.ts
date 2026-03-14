export type Note = {
    pitch: string        // e.g. "E4"
    string?: number      // 吉他弦（可选）1-6, 1=高音e, 6=低音E
    fret?: number        // 品位 0-24
    start: number        // 拍位置（第几拍，从0开始）
    duration: number     // 音长（以拍为单位）
}

export type TabNote = {  // 六线谱上的音符
    string: number       // 弦号 1-6
    fret: number         // 品位 0-24
    beat: number         // 在小节中的拍位置（0-based）
}

export type TimeSignature = {
    beats: number        // 每小节拍数
    beatValue: number    // 以几分音符为一拍
}

export type Measure = { // 小节
    index: number
    notes: Note[]
    tabNotes?: TabNote[] // 六线谱音符
}

export type Score = { // 谱子
    _id?: string
    title?: string
    bpm: number
    timeSignature: TimeSignature
    tuning?: string[]    // 调弦，默认标准调弦 ["E2","A2","D3","G3","B3","E4"]
    measures: Measure[]
    createdAt?: string
    updatedAt?: string
}
