import { Platform } from "react-native"

// ─── 音高到频率映射 ───
// A4 = 440Hz，使用十二平均律计算其他音高的频率
const NOTE_SEMITONES: Record<string, number> = {
    "C": -9, "C#": -8, "Db": -8,
    "D": -7, "D#": -6, "Eb": -6,
    "E": -5,
    "F": -4, "F#": -3, "Gb": -3,
    "G": -2, "G#": -1, "Ab": -1,
    "A": 0, "A#": 1, "Bb": 1,
    "B": 2,
}

// MIDI 音符名（0=C, 1=C#, ..., 11=B）
const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

/**
 * 将 pitch 字符串转换为 MIDI 音符编号（A4 = 69）
 */
export function pitchToMidi(pitch: string): number {
    const match = pitch.match(/^([A-G])(#|b)?(\d+)$/)
    if (!match) return 69
    const noteName = match[1] + (match[2] || "")
    const octave = parseInt(match[3], 10)
    const semitone = NOTE_SEMITONES[noteName]
    if (semitone === undefined) return 69
    return 69 + semitone + (octave - 4) * 12
}

/**
 * 将 MIDI 音符编号转换为 pitch 字符串（如 69 → "A4"）
 */
export function midiToPitch(midi: number): string {
    const noteIndex = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1
    return MIDI_NOTE_NAMES[noteIndex] + octave
}

/**
 * 将 pitch 字符串（如 "E4", "C#5"）转换为频率（Hz）
 */
export function pitchToFrequency(pitch: string): number {
    const match = pitch.match(/^([A-G])(#|b)?(\d+)$/)
    if (!match) return 440

    const noteName = match[1] + (match[2] || "")
    const octave = parseInt(match[3], 10)

    const semitone = NOTE_SEMITONES[noteName]
    if (semitone === undefined) return 440

    // A4 = 440Hz, 每个半音 * 2^(1/12)
    const semitonesFromA4 = semitone + (octave - 4) * 12
    return 440 * Math.pow(2, semitonesFromA4 / 12)
}

const isWeb = Platform.OS === "web"
const FUNDAMENTAL_GAIN = 0.88
const SECOND_HARMONIC_GAIN = 0.09
const THIRD_HARMONIC_GAIN = 0.03

// ─── Web Audio API 实现 ───
let webAudioCtx: AudioContext | null = null

function getWebAudioContext(): AudioContext {
    if (!webAudioCtx) {
        webAudioCtx = new AudioContext()
    }
    return webAudioCtx
}

function playNotesWeb(frequencies: number[], durationSec: number, volume: number = 0.3) {
    const ctx = getWebAudioContext()
    const ampPerNote = frequencies.length > 0 ? volume / frequencies.length : 0
    const now = ctx.currentTime

    for (const freq of frequencies) {
        // 基音
        const osc1 = ctx.createOscillator()
        osc1.type = "sine"
        osc1.frequency.value = freq

        // 二次泛音
        const osc2 = ctx.createOscillator()
        osc2.type = "sine"
        osc2.frequency.value = freq * 2

        // 三次泛音
        const osc3 = ctx.createOscillator()
        osc3.type = "sine"
        osc3.frequency.value = freq * 3

        const gain1 = ctx.createGain()
        const gain2 = ctx.createGain()
        const gain3 = ctx.createGain()

        gain1.gain.value = ampPerNote * FUNDAMENTAL_GAIN
        gain2.gain.value = ampPerNote * SECOND_HARMONIC_GAIN
        gain3.gain.value = ampPerNote * THIRD_HARMONIC_GAIN

        // 淡出
        const fadeOutTime = durationSec * 0.7
        gain1.gain.setValueAtTime(ampPerNote * FUNDAMENTAL_GAIN, now + fadeOutTime)
        gain1.gain.linearRampToValueAtTime(0, now + durationSec)
        gain2.gain.setValueAtTime(ampPerNote * SECOND_HARMONIC_GAIN, now + fadeOutTime)
        gain2.gain.linearRampToValueAtTime(0, now + durationSec)
        gain3.gain.setValueAtTime(ampPerNote * THIRD_HARMONIC_GAIN, now + fadeOutTime)
        gain3.gain.linearRampToValueAtTime(0, now + durationSec)

        osc1.connect(gain1).connect(ctx.destination)
        osc2.connect(gain2).connect(ctx.destination)
        osc3.connect(gain3).connect(ctx.destination)

        osc1.start(now)
        osc2.start(now)
        osc3.start(now)

        osc1.stop(now + durationSec)
        osc2.stop(now + durationSec)
        osc3.stop(now + durationSec)
    }
}

// ─── Native (expo-av + expo-file-system) 实现 ───
const SAMPLE_RATE = 44100

function generateWavBytes(
    frequencies: number[],
    durationSec: number,
    volume: number = 0.3
): Uint8Array {
    const numSamples = Math.floor(SAMPLE_RATE * durationSec)
    const numChannels = 1
    const bitsPerSample = 16
    const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)
    const dataSize = numSamples * blockAlign

    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    writeString(view, 0, "RIFF")
    view.setUint32(4, 36 + dataSize, true)
    writeString(view, 8, "WAVE")

    writeString(view, 12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, SAMPLE_RATE, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)

    writeString(view, 36, "data")
    view.setUint32(40, dataSize, true)

    const ampPerNote = frequencies.length > 0 ? volume / frequencies.length : 0
    const fadeOutStart = Math.floor(numSamples * 0.7)

    for (let i = 0; i < numSamples; i++) {
        let sample = 0
        const t = i / SAMPLE_RATE

        for (const freq of frequencies) {
            sample += Math.sin(2 * Math.PI * freq * t) * FUNDAMENTAL_GAIN
            sample += Math.sin(2 * Math.PI * freq * 2 * t) * SECOND_HARMONIC_GAIN
            sample += Math.sin(2 * Math.PI * freq * 3 * t) * THIRD_HARMONIC_GAIN
        }

        sample *= ampPerNote

        const fadeInSamples = Math.floor(SAMPLE_RATE * 0.005)
        if (i < fadeInSamples) {
            sample *= i / fadeInSamples
        }

        if (i > fadeOutStart) {
            const fadeProgress = (i - fadeOutStart) / (numSamples - fadeOutStart)
            sample *= 1 - fadeProgress
        }

        sample = Math.max(-1, Math.min(1, sample))
        const intSample = Math.floor(sample * 32767)
        view.setInt16(44 + i * 2, intSample, true)
    }

    return new Uint8Array(buffer)
}

function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
    }
}

// ─── Native 音频缓存 ───
let nativeSoundCache: Map<string, any> | null = null
let nativeFileCache: Map<string, string> | null = null

function getNativeSoundCache() {
    if (!nativeSoundCache) nativeSoundCache = new Map()
    return nativeSoundCache
}

function getNativeFileCache() {
    if (!nativeFileCache) nativeFileCache = new Map()
    return nativeFileCache
}

async function playNotesNative(frequencies: number[], pitches: string[], durationSec: number) {
    // 动态导入，避免 Web 端加载 native 模块
    const { Audio } = require("expo-av")
    const { File: FSFile, Paths } = require("expo-file-system")

    const soundCache = getNativeSoundCache()
    const fileCache = getNativeFileCache()
    const cacheKey = `${[...pitches].sort().join(",")}_${durationSec.toFixed(3)}`

    let sound = soundCache.get(cacheKey)

    if (!sound) {
        const wavBytes = generateWavBytes(frequencies, durationSec)

        // 写入临时文件
        const safeName = cacheKey.replace(/[^a-zA-Z0-9_-]/g, "_")
        let fileUri = fileCache.get(cacheKey)
        if (!fileUri) {
            const file = new FSFile(Paths.cache, `synth_${safeName}.wav`)
            file.write(wavBytes)
            fileUri = file.uri
            fileCache.set(cacheKey, fileUri!)
        }

        sound = new Audio.Sound()
        try {
            await sound.loadAsync({ uri: fileUri! })
            soundCache.set(cacheKey, sound)
        } catch (e) {
            console.warn("Failed to load synthesized audio:", e)
            return
        }
    } else {
        try {
            await sound.setPositionAsync(0)
        } catch {
            const fileUri = fileCache.get(cacheKey)
            if (fileUri) {
                sound = new Audio.Sound()
                await sound.loadAsync({ uri: fileUri })
                soundCache.set(cacheKey, sound)
            }
        }
    }

    try {
        await sound.playAsync()
    } catch (e) {
        console.warn("Failed to play audio:", e)
    }
}

// ─── 公共 API ───

/**
 * 播放一组音符（支持和弦）
 * @param pitches 音高字符串数组，如 ["E4", "G4"]
 * @param durationSec 持续时间（秒）
 */
export async function playNotes(
    pitches: string[],
    durationSec: number
): Promise<void> {
    if (pitches.length === 0) return

    const frequencies = pitches.map(pitchToFrequency)

    if (isWeb) {
        playNotesWeb(frequencies, durationSec)
    } else {
        await playNotesNative(frequencies, pitches, durationSec)
    }
}

/**
 * 停止并释放所有缓存的音频
 */
export async function releaseAllSounds() {
    if (isWeb) {
        if (webAudioCtx) {
            await webAudioCtx.close()
            webAudioCtx = null
        }
        return
    }

    const soundCache = getNativeSoundCache()
    for (const [, sound] of soundCache) {
        try {
            await sound.stopAsync()
            await sound.unloadAsync()
        } catch (e) {
            // ignore
        }
    }
    soundCache.clear()
}

/**
 * 设置音频模式（在播放前调用一次）
 */
export async function setupAudioMode() {
    if (isWeb) {
        // Web 端：确保 AudioContext 已创建（需要用户交互后才能 resume）
        const ctx = getWebAudioContext()
        if (ctx.state === "suspended") {
            await ctx.resume()
        }
        return
    }

    const { Audio } = require("expo-av")
    await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
    })
}
