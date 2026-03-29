import { useState, useCallback, useRef, useEffect } from "react"
import { Score, TabNote } from "../models/Score"
import { playNotes, releaseAllSounds, setupAudioMode, pitchToMidi, midiToPitch } from "../utils/audioSynth"

const DEFAULT_TAB_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"]

function getEffectiveTuning(tuning?: string[]): string[] {
    return tuning?.length === 6 ? tuning : DEFAULT_TAB_TUNING
}

/** 将六线谱音符（弦+品位+推弦）转换为音高字符串，tuning[0]=string6(低E), tuning[5]=string1(高e) */
function tabNoteToPitch(note: TabNote, tuning: string[]): string {
    const openStringPitch = tuning[6 - note.string] ?? "E4"
    const openMidi = pitchToMidi(openStringPitch)
    const bendSemitones = note.bend ?? 0
    return midiToPitch(openMidi + note.fret + bendSemitones)
}

export type PlaybackState = "stopped" | "playing" | "paused"

export type PlaybackPosition = {
    measureIndex: number
    beat: number
}

type BeatEvent = {
    measureIndex: number
    beat: number
    pitches: string[]
    durationSec: number
    /** 到下一个事件的等待时间（毫秒），用于 setTimeout 调度 */
    gapMs: number
}

type TimedPitch = {
    startBeat: number
    displayBeat: number
    pitch: string
    duration: number
}

function roundBeat(value: number): number {
    return Math.round(value * 10000) / 10000
}

function buildTimedPitchesForMeasure(
    measure: Score["measures"][number],
    tuning: string[],
): TimedPitch[] {
    const timed: TimedPitch[] = []

    for (const note of (measure.notes || [])) {
        timed.push({
            startBeat: roundBeat(note.start),
            displayBeat: roundBeat(note.start),
            pitch: note.pitch,
            duration: note.duration,
        })
    }

    const groupedTabNotes = new Map<number, TabNote[]>()
    for (const tabNote of (measure.tabNotes || [])) {
        const slot = roundBeat(tabNote.beat)
        if (!groupedTabNotes.has(slot)) groupedTabNotes.set(slot, [])
        groupedTabNotes.get(slot)!.push(tabNote)
    }

    let accumulatedBeat = 0
    const sortedSlots = Array.from(groupedTabNotes.keys()).sort((a, b) => a - b)
    for (const slot of sortedSlots) {
        const notesAtSlot = groupedTabNotes.get(slot) ?? []
        const slotDuration = Math.max(...notesAtSlot.map(note => note.duration ?? 1))
        const startBeat = roundBeat(accumulatedBeat)

        for (const tabNote of notesAtSlot) {
            timed.push({
                startBeat,
                displayBeat: slot,
                pitch: tabNoteToPitch(tabNote, tuning),
                duration: tabNote.duration ?? 1,
            })
        }

        accumulatedBeat = roundBeat(accumulatedBeat + slotDuration)
    }

    return timed
}

/**
 * 将 Score 展开为按时间顺序排列的 beat 事件列表。
 * 支持五线谱 notes 和六线谱 tabNotes（含推弦），每个事件携带正确的间隔时长。
 */
function buildBeatEvents(score: Score): BeatEvent[] {
    const events: BeatEvent[] = []
    const beatDurationSec = 60 / score.bpm
    const tuning = getEffectiveTuning(score.tuning)

    for (const measure of score.measures) {
        const timedPitches = buildTimedPitchesForMeasure(measure, tuning)
        const startMap = new Map<number, TimedPitch[]>()

        for (const timedPitch of timedPitches) {
            if (!startMap.has(timedPitch.startBeat)) startMap.set(timedPitch.startBeat, [])
            startMap.get(timedPitch.startBeat)!.push(timedPitch)
        }

        const positionSet = new Set<number>(startMap.keys())
        if (!positionSet.has(0) && timedPitches.length > 0) {
            positionSet.add(0)
        }

        const sortedPositions = Array.from(positionSet).sort((a, b) => a - b)

        for (let i = 0; i < sortedPositions.length; i++) {
            const startBeat = sortedPositions[i]
            const nextBeat = i + 1 < sortedPositions.length
                ? sortedPositions[i + 1]
                : score.timeSignature.beats

            const notesAtBeat = startMap.get(startBeat) || []
            const pitches = notesAtBeat.map(note => note.pitch)
            const durations = notesAtBeat.map(note => note.duration)
            const displayBeat = notesAtBeat[0]?.displayBeat ?? startBeat

            // 音符发声时长：取该位置最短音符时长
            let durationBeats = nextBeat - startBeat
            if (durations.length > 0) {
                durationBeats = Math.min(...durations)
            }

            // 到下一事件的间隔：由位置差决定，与音符时值无关
            const gapBeats = nextBeat - startBeat

            events.push({
                measureIndex: measure.index,
                beat: displayBeat,
                pitches,
                durationSec: durationBeats * beatDurationSec,
                gapMs: gapBeats * beatDurationSec * 1000,
            })
        }
    }

    return events
}

export function useScorePlayer(score: Score) {
    const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped")
    const [currentPosition, setCurrentPosition] = useState<PlaybackPosition | null>(null)

    const playbackStateRef = useRef<PlaybackState>("stopped")
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const eventIndexRef = useRef(0)
    const audioInitialized = useRef(false)

    // 同步 ref
    useEffect(() => {
        playbackStateRef.current = playbackState
    }, [playbackState])

    // 清理
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
            releaseAllSounds()
        }
    }, [])

    const playBeatSequence = useCallback(async (events: BeatEvent[], startIndex: number) => {
        if (startIndex >= events.length) {
            // 播放完毕
            setPlaybackState("stopped")
            setCurrentPosition(null)
            eventIndexRef.current = 0
            return
        }

        if (playbackStateRef.current !== "playing") return

        const event = events[startIndex]
        eventIndexRef.current = startIndex

        // 更新当前位置（用于高亮）
        setCurrentPosition({
            measureIndex: event.measureIndex,
            beat: event.beat,
        })

        // 播放音符
        if (event.pitches.length > 0) {
            await playNotes(event.pitches, event.durationSec)
        }

        // 安排下一拍：使用该事件自身的间隔时长，正确支持分数拍
        timerRef.current = setTimeout(() => {
            if (playbackStateRef.current === "playing") {
                playBeatSequence(events, startIndex + 1)
            }
        }, event.gapMs)
    }, [])

    const play = useCallback(async () => {
        // 初始化音频模式
        if (!audioInitialized.current) {
            await setupAudioMode()
            audioInitialized.current = true
        }

        const events = buildBeatEvents(score)
        if (events.length === 0) return

        setPlaybackState("playing")

        // 从 eventIndexRef 指向的位置开始（stop 重置为 0，seekTo 更新到目标位置，pause 保留当前位置）
        const startIdx = eventIndexRef.current
        playbackStateRef.current = "playing"

        playBeatSequence(events, startIdx)
    }, [score, playBeatSequence])

    const pause = useCallback(() => {
        setPlaybackState("paused")
        playbackStateRef.current = "paused"
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const stop = useCallback(() => {
        setPlaybackState("stopped")
        playbackStateRef.current = "stopped"
        setCurrentPosition(null)
        eventIndexRef.current = 0
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const togglePlayPause = useCallback(async () => {
        if (playbackState === "playing") {
            pause()
        } else {
            await play()
        }
    }, [playbackState, play, pause])

    /**
     * 跳转到指定小节和拍位置。
     * - 若正在播放，立即从该位置继续播放。
     * - 若暂停或停止，更新光标位置，下次播放从此处开始。
     */
    const seekTo = useCallback((measureIndex: number, beat: number) => {
        const events = buildBeatEvents(score)
        const idx = events.findIndex(e => e.measureIndex === measureIndex && e.beat === beat)
        if (idx < 0) return

        eventIndexRef.current = idx
        setCurrentPosition({ measureIndex, beat })

        if (playbackStateRef.current === "playing") {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            playBeatSequence(events, idx)
        }
    }, [score, playBeatSequence])

    return {
        playbackState,
        currentPosition,
        play,
        pause,
        stop,
        togglePlayPause,
        seekTo,
    }
}
