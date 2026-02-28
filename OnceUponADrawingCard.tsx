/*
 * ============================================================
 * ONCE UPON A DRAWING — Portfolio Card for Sweetwater Technology
 * ============================================================
 *
 * CODEBASE RESEARCH SUMMARY:
 *
 * Product: AI-powered web app that transforms children's drawings into
 * cinematic Pixar-style storybooks and museum-grade printed hardcover books.
 * Tagline: "Every scribble has a story."
 *
 * Brand Colors (from tailwind.config.js):
 *   - Pacific Cyan:  #62929e  (primary accent, CTAs, highlights)
 *   - Soft Gold:     #d4a574  (secondary accent, premium tier)
 *   - Gunmetal:      #393d3f  (primary text, dark UI)
 *   - Off-White:     #fdfdff  (background)
 *   - Silver:        #c6c5b9  (borders, secondary text)
 *   - Blue-Slate:    #546a7b  (descriptive copy)
 *
 * Typography: Inter (400–800) via Google Fonts, with italic serif
 * accents for display headings. Heavy use of font-black (800/900),
 * tracking-tight headings, and uppercase tracking-widest labels.
 *
 * Design Language: Massive rounded corners (up to 80px), colored
 * shadows with brand tints, scale-on-hover interactions, glass
 * morphism overlays, animated gradient blobs in backgrounds.
 * Generous whitespace, 3D-style button borders, confetti effects.
 *
 * Mood: Whimsical yet premium. Magical transformation narrative.
 * Warm, family-oriented, nostalgic. Celebrates children's creativity
 * with language like "alchemy," "magic," "keepsake," "legacy."
 *
 * Tech Stack: React 19, Vite, TypeScript, Tailwind CSS 3,
 * Framer Motion, Supabase, Google Generative AI (Gemini), Stripe.
 *
 * Card Design Concept: Evokes the magical transformation from a
 * child's crayon scribble into a treasured storybook. A whimsical
 * crayon-stroke border hints at the hand-drawn origin. On hover,
 * the card lifts and glows with a soft Pacific Cyan aura — the
 * moment of "magic" when a drawing becomes a story. The Soft Gold
 * accent marks the premium, keepsake quality. Typography mixes
 * the product's bold Inter with its signature italic serif accents.
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, ArrowUpRight, Palette } from "lucide-react";

interface AppProject {
  id: string;
  title: string;
  category: string;
  description: string;
  longDescription: string;
  image: string;
  tags: string[];
  link: string;
  color: string;
}

interface OnceUponADrawingCardProps {
  app: AppProject;
  index: number;
  onClick: () => void;
}

const OnceUponADrawingCard: React.FC<OnceUponADrawingCardProps> = ({
  app,
  index,
  onClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -8,
        transition: { duration: 0.35, ease: "easeOut" },
      }}
      onClick={onClick}
      className="group relative cursor-pointer"
      style={{ perspective: "1200px" }}
    >
      {/* Glow layer — visible on hover */}
      <div
        className="absolute -inset-3 rounded-[2.5rem] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(98,146,158,0.3) 0%, rgba(212,165,116,0.15) 50%, transparent 80%)",
        }}
      />

      {/* Card body */}
      <div
        className="relative overflow-hidden rounded-[2rem] border-2 transition-all duration-500 group-hover:border-[#62929e]/60"
        style={{
          borderColor: "#c6c5b9",
          background:
            "linear-gradient(165deg, #fdfdff 0%, #f8f7f4 55%, #f0ede8 100%)",
          boxShadow:
            "0 4px 24px -4px rgba(57,61,63,0.08), 0 1px 3px rgba(57,61,63,0.06)",
        }}
      >
        {/* Decorative crayon scribble — top-right corner */}
        <svg
          className="absolute -right-4 -top-4 h-32 w-32 opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.12]"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 90 C30 70, 50 30, 80 25 C95 22, 105 40, 100 55 C92 78, 60 95, 40 85"
            stroke="#d4a574"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M15 80 C35 60, 55 20, 90 30 C100 33, 108 50, 95 65 C80 82, 50 90, 30 78"
            stroke="#62929e"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="75" cy="25" r="4" fill="#d4a574" opacity="0.4" />
          <circle cx="95" cy="50" r="3" fill="#62929e" opacity="0.3" />
        </svg>

        {/* Image area */}
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(to top, #f8f7f4 0%, transparent 40%)",
            }}
          />
          <motion.img
            src={app.image}
            alt={app.title}
            className="h-52 w-full object-cover object-top"
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          {/* Category pill — top-left */}
          <div className="absolute left-4 top-4 z-20">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]"
              style={{
                background: "rgba(253,253,255,0.85)",
                backdropFilter: "blur(12px)",
                color: "#546a7b",
                border: "1px solid rgba(198,197,185,0.5)",
              }}
            >
              <Palette size={11} strokeWidth={2.5} />
              {app.category}
            </div>
          </div>

          {/* Sparkle accent — floats on hover */}
          <motion.div
            className="absolute right-4 top-4 z-20"
            animate={{ rotate: [0, 15, -10, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Sparkles
              size={20}
              className="opacity-30 transition-opacity duration-500 group-hover:opacity-70"
              style={{ color: "#d4a574" }}
            />
          </motion.div>
        </div>

        {/* Content area */}
        <div className="relative px-6 pb-6 pt-2">
          {/* Title — bold Inter with italic serif accent, matching product's hero typography */}
          <h3
            className="mb-1.5 text-xl font-black tracking-tight"
            style={{ color: "#393d3f" }}
          >
            {app.title}
          </h3>

          {/* Thin accent underline */}
          <div className="mb-3 flex items-center gap-2">
            <div
              className="h-[2px] w-8 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #62929e, #d4a574)",
              }}
            />
            <div
              className="h-[2px] w-3 rounded-full"
              style={{ background: "#d4a574", opacity: 0.4 }}
            />
          </div>

          {/* Description */}
          <p
            className="mb-4 text-sm font-medium leading-relaxed"
            style={{ color: "#546a7b" }}
          >
            {app.description}
          </p>

          {/* Tags */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            {app.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "rgba(98,146,158,0.08)",
                  color: "#62929e",
                  border: "1px solid rgba(98,146,158,0.15)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Learn More — primary CTA */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-black uppercase tracking-[0.15em] text-white transition-shadow duration-300 hover:shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, #62929e 0%, #547f8a 100%)",
                boxShadow: "0 4px 14px -3px rgba(98,146,158,0.4)",
              }}
            >
              <BookOpen size={13} strokeWidth={2.5} />
              Learn More
            </motion.button>

            {/* Demo link — secondary */}
            <motion.a
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              href={app.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all duration-300 hover:border-[#62929e] hover:text-[#62929e]"
              style={{
                borderColor: "#c6c5b9",
                color: "#546a7b",
                background: "#fdfdff",
              }}
            >
              <ArrowUpRight size={16} strokeWidth={2.5} />
            </motion.a>
          </div>
        </div>

        {/* Bottom edge — soft gold accent stripe (the "premium keepsake" signature) */}
        <div
          className="h-1 w-full opacity-60 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(to right, transparent, #d4a574, #62929e, transparent)",
          }}
        />
      </div>
    </motion.div>
  );
};

export default OnceUponADrawingCard;

/*
 * ============================================================
 * SWEETWATER CONSTANTS.TSX ENTRY:
 *
 * {
 *   id: "once-upon-a-drawing",
 *   title: "Once Upon a Drawing",
 *   category: "AI / Creative",
 *   description: "Transforms children's drawings into cinematic Pixar-style storybooks and museum-grade printed hardcover keepsakes. Every scribble has a story.",
 *   longDescription: "Once Upon a Drawing uses AI to analyze a child's artwork — extracting characters, scenes, and emotions — then generates a 12-spread cinematic storybook with Pixar-quality 3D illustrations and an HD animation. Parents can order archival-quality printed hardcovers, turning ephemeral crayon scribbles into treasured family keepsakes that last generations.",
 *   image: "/images/once-upon-a-drawing-preview.svg",
 *   tags: ["React", "TypeScript", "Tailwind CSS", "Framer Motion", "Supabase", "Gemini AI", "Stripe"],
 *   link: "https://onceuponadrawing.com",
 *   color: "#62929e"
 * }
 * ============================================================
 */
