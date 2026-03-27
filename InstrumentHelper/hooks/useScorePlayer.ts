import { useState, useCallback, useRef, useEffect } from "react"
import { Score, Measure, Note } from "../models/Score"
import { playNotes, releaseAllSounds, setupAudioMode } from "../utils/audioSynth"

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
}

/**
 * 将 Score 展开为按时间顺序排列的 beat 事件列表
 */
function buildBeatEvents(score: Score): BeatEvent[] {
    const events: BeatEvent[] = []
    const beatDurationSec = 60 / score.bpm // 每拍的秒数

    for (const measure of score.measures) {
        // 收集每个拍位置上的所有音符
        const beatMap = new Map<number, Note[]>()

        for (const note of measure.notes) {
            const beat = note.start
            if (!beatMap.has(beat)) {
                beatMap.set(beat, [])
            }
            beatMap.get(beat)!.push(note)
        }

        // 为每个拍位置创建事件（包括空拍）
        for (let beat = 0; beat < score.timeSignature.beats; beat++) {
            const notes = beatMap.get(beat) || []
            const pitches = notes.map(n => n.pitch)

            // 计算音符持续时间：取该拍位置上最短的音符时长
            let durationBeats = 1
            if (notes.length > 0) {
                durationBeats = Math.min(...notes.map(n => n.duration))
            }

            events.push({
                measureIndex: measure.index,
                beat,
                pitches,
                durationSec: durationBeats * beatDurationSec,
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

    const beatDurationMs = (60 / score.bpm) * 1000

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

        // 安排下一拍
        timerRef.current = setTimeout(() => {
            if (playbackStateRef.current === "playing") {
                playBeatSequence(events, startIndex + 1)
            }
        }, beatDurationMs)
    }, [beatDurationMs])

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
