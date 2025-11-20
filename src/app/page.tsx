"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./page.module.css";

interface Cue {
  title: string;
  subtitle: string;
  duration: number;
  spokenLines: string[];
}

const cues: Cue[] = [
  {
    title: "Johny Johny",
    subtitle: "Yes Papa!",
    duration: 3500,
    spokenLines: ["Johny Johny", "Yes Papa"]
  },
  {
    title: "Eating sugar?",
    subtitle: "No Papa!",
    duration: 3400,
    spokenLines: ["Eating sugar?", "No Papa"]
  },
  {
    title: "Telling lies?",
    subtitle: "No Papa!",
    duration: 3200,
    spokenLines: ["Telling lies?", "No Papa"]
  },
  {
    title: "Open your mouth",
    subtitle: "Ha ha ha!",
    duration: 3800,
    spokenLines: ["Open your mouth", "Ha ha ha"]
  }
];

const totalDuration = cues.reduce((memo, cue) => memo + cue.duration, 0);

function useSpeechPerformer() {
  const [ready, setReady] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synthesis = window.speechSynthesis;

    const handleVoices = () => {
      const voices = synthesis.getVoices();
      const preferred =
        voices.find((voice) =>
          ["en-US", "en-GB", "en-IN"].some((locale) => voice.lang.startsWith(locale))
        ) ?? voices[0] ?? null;
      voiceRef.current = preferred;
      setReady(true);
    };

    handleVoices();
    synthesis.addEventListener("voiceschanged", handleVoices);

    return () => {
      synthesis.removeEventListener("voiceschanged", handleVoices);
    };
  }, []);

  const speak = (text: string, opts?: Partial<SpeechSynthesisUtterance>) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = opts?.pitch ?? 1.4;
    utterance.rate = opts?.rate ?? 1;
    utterance.volume = opts?.volume ?? 0.9;
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    window.speechSynthesis.speak(utterance);
  };

  const cancel = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
  };

  const pause = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.pause();
  };

  const resume = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.resume();
  };

  return { ready, speak, cancel, pause, resume };
}

export default function Page() {
  const { ready: speechReady, speak, cancel, pause, resume } = useSpeechPerformer();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeCueIndex, setActiveCueIndex] = useState<number | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const vocalTimeoutsRef = useRef<number[]>([]);
  const clearVocalTimeouts = () => {
    vocalTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    vocalTimeoutsRef.current = [];
  };

  const sparklingStars = useMemo(() => {
    return Array.from({ length: 16 }).map((_, index) => {
      const size = 8 + Math.random() * 12;
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      return { id: `${index}-${size}`, size, top, left };
    });
  }, []);

  const resetShow = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    cancel();
    clearVocalTimeouts();
    setIsPlaying(false);
    setProgress(0);
    setActiveCueIndex(null);
    startTimeRef.current = null;
    lastSpokenRef.current = null;
  };

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      return;
    }

    const step = () => {
      const now = performance.now();
      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }
      const elapsed = now - startTimeRef.current;
      const nextProgress = Math.min(elapsed / totalDuration, 1);
      setProgress(nextProgress);

      let accumulated = 0;
      let currentIndex: number | null = null;
      for (let i = 0; i < cues.length; i += 1) {
        accumulated += cues[i].duration;
        if (elapsed <= accumulated) {
          currentIndex = i;
          break;
        }
      }

      if (currentIndex === null) {
        setIsPlaying(false);
        setActiveCueIndex(null);
        setProgress(1);
        startTimeRef.current = null;
        lastSpokenRef.current = null;
        return;
      }

      setActiveCueIndex(currentIndex);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    vocalTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    vocalTimeoutsRef.current = [];

    if (!isPlaying || activeCueIndex === null) {
      return;
    }
    if (lastSpokenRef.current === activeCueIndex) {
      return;
    }
    lastSpokenRef.current = activeCueIndex;

    const cue = cues[activeCueIndex];
    cue.spokenLines.forEach((line, index) => {
      const timeoutId = window.setTimeout(() => {
        speak(line, {
          rate: 0.96 + index * 0.06,
          pitch: 1.2 + index * 0.1
        });
      }, Math.max(0, index * (cue.duration / cue.spokenLines.length) - 150));
      vocalTimeoutsRef.current.push(timeoutId);
    });
  }, [activeCueIndex, speak, isPlaying]);

  const handleStart = () => {
    resetShow();
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying((prev) => {
      if (prev) {
        pause();
        clearVocalTimeouts();
      }
      return !prev;
    });
    if (!isPlaying) {
      resume();
      lastSpokenRef.current = null;
      startTimeRef.current = performance.now() - progress * totalDuration;
    }
  };

  const handleReplay = () => {
    resetShow();
    window.setTimeout(() => {
      setIsPlaying(true);
    }, 120);
  };

  const peek = () => {
    if (!bannerRef.current) {
      return;
    }
    bannerRef.current.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-12px) scale(1.04)" },
        { transform: "translateY(0) scale(1)" }
      ],
      {
        duration: 600,
        easing: "cubic-bezier(.46,1.58,.53,.67)"
      }
    );
  };

  const stageLabel = isPlaying ? "Singing" : progress > 0 ? "Paused" : "Ready";

  return (
    <main className={styles.main}>
      <div className={styles.skyBackdrop} />
      <div className={styles.clouds} />
      <div className={styles.stars}>
        {sparklingStars.map((star, index) => (
          <motion.span
            className={styles.star}
            key={star.id}
            style={{ top: `${star.top}%`, left: `${star.left}%`, width: star.size, height: star.size }}
            animate={{ opacity: [0.25, 0.9, 0.25] }}
            transition={{ duration: 3 + index * 0.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className={styles.content}>
        <section className={styles.hero}>
          <motion.div
            ref={bannerRef}
            className={styles.character}
            initial={{ y: -18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className={styles.face}>
              <div className={styles.eyeRow}>
                <div className={styles.eye}>
                  <div className={styles.pupil} />
                </div>
                <div className={styles.eye}>
                  <div className={styles.pupil} />
                </div>
              </div>
              <div className={styles.cheeks}>
                <div className={styles.cheek} />
                <div className={styles.cheek} />
              </div>
              <div className={styles.mouth} />
            </div>
            <div className={styles.hands}>
              <span className={styles.hand} />
              <span className={styles.hand} />
            </div>
            <div className={styles.sparkleCluster}>
              <span className={styles.sparkle} style={{ top: "12%", left: "16%" }} />
              <span className={styles.sparkle} style={{ top: "40%", left: "72%" }} />
              <span className={styles.sparkle} style={{ top: "68%", left: "48%" }} />
            </div>
          </motion.div>
        </section>

        <section className={styles.stage}>
          <div className={styles.microphone} />
          <AnimatePresence mode="wait">
            <motion.h1
              key={activeCueIndex ?? -1}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              Peekabo Sings “Johny Johny Yes Papa”
            </motion.h1>
          </AnimatePresence>
          <p>
            {speechReady
              ? "Tap play to hear Peekabo sing the classic rhyme with a bubbly beat!"
              : "Tap play to watch the lyrics animate – enable speech synthesis in your browser for vocals."}
          </p>
          <div className={styles.controls}>
            <button className={styles.playButton} onClick={handleStart} type="button">
              Play Show
            </button>
            <button className={styles.controlButton} onClick={handlePause} type="button">
              {isPlaying ? "Pause" : progress > 0 ? "Resume" : "Cue"}
            </button>
            <button className={styles.controlButton} onClick={handleReplay} type="button">
              Replay
            </button>
            <button className={styles.controlButton} onClick={peek} type="button">
              Peekaboo!
            </button>
          </div>

          <div className={styles.timeline}>
            <span className={styles.timelineLabel}>{stageLabel}</span>
            <div className={styles.timelineBar}>
              <div className={styles.timelineFill} style={{ width: `${progress * 100}%` }} />
            </div>
            <span className={styles.timelineLabel}>{Math.round(progress * 100)}%</span>
          </div>

          <div className={styles.lyrics}>
            {cues.map((cue, index) => {
              const isActive = activeCueIndex === index && isPlaying;
              return (
                <div
                  key={cue.title}
                  className={`${styles.lineCard} ${isActive ? styles.lineCardActive : ""}`}
                >
                  <div className={styles.lineTitle}>{cue.title}</div>
                  <div className={styles.lineSubtitle}>{cue.subtitle}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
