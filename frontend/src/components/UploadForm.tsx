"use client";

import { useState, useRef } from "react";
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  ImagePlus,
  Printer,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadedTile {
  id: string;
  imageUrl: string;
  gridX: number;
  gridY: number;
  uploader?: string | null;
  gridWidth?: number;
}

export default function UploadForm({ mosaicId }: { mosaicId?: string } = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedTile, setUploadedTile] = useState<UploadedTile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (name.trim()) formData.append('name', name.trim());
      if (email.trim()) formData.append('email', email.trim());
      if (mosaicId) formData.append('mosaicId', mosaicId);
      const backendUrl = "https://mosaic-wall-backend.salurprabha.workers.dev";
      const token = typeof window !== 'undefined' ? localStorage.getItem('mosaic_token') : null;
      
      const res = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed — please try again.");
      const data = await res.json();
      setUploadedTile(data.tile || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => { setUploadedTile(null); setFile(null); setPreview(null); setName(''); setEmail(''); setError(null); };

  // ── Success / Sticker preview ──────────────────────────────────────────────
  if (uploadedTile) {
    const displayName = uploadedTile.uploader || name || "Guest";
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex flex-col items-center space-y-8 w-full max-w-md mx-auto text-center"
      >
        {/* Celebration Header */}
        <div className="space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, delay: 0.1 }}
            className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Congratulations!
          </h2>
          <p className="text-slate-400 text-lg font-medium">
            Your photo is now live on the wall.
          </p>
        </div>

        {/* Uploaded Photo Preview */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative w-full aspect-square rounded-[2.5rem] overflow-hidden border-4 border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.2)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadedTile.imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-0 right-0">
            <p className="text-white font-black text-xl tracking-wide uppercase drop-shadow-md">
              {displayName}
            </p>
            <p className="text-indigo-300 font-bold text-sm tracking-widest mt-1">
              JOINED THE MOSAIC ✦
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 w-full pt-4">
          <button
            onClick={reset}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-lg transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 active:translate-y-0"
          >
            Upload Another Photo
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-4 text-slate-400 hover:text-white font-bold text-sm transition-colors"
          >
            Return to Home
          </button>
        </div>

        {/* Confetti-like effect with floating dots */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-indigo-500/40"
              initial={{ 
                x: "50%", 
                y: "50%", 
                opacity: 0 
              }}
              animate={{ 
                x: `${Math.random() * 100}%`, 
                y: `${Math.random() * 100}%`,
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto p-8 space-y-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />

      <div className="space-y-2 relative z-10 text-center">
        <h2 className="text-3xl font-black tracking-tight text-white">
          Join the Mosaic
        </h2>
        <p className="text-slate-400 font-medium">
          Upload a photo to be part of the live digital wall.
        </p>
      </div>

      <div className="relative z-10">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full aspect-square md:aspect-[4/3] rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${preview ? "border-transparent shadow-2xl" : "border-slate-700 bg-slate-950/50 hover:border-indigo-500/50 hover:bg-slate-900"}`}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <span className="text-white font-bold tracking-wide flex items-center bg-white/20 px-6 py-3 rounded-full backdrop-blur-md">
                  <ImagePlus className="w-5 h-5 mr-2" /> Change Photo
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all border border-slate-700 group-hover:border-indigo-500/30">
                <Camera className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div>
                <p className="font-bold text-lg text-slate-200 group-hover:text-indigo-400 transition-colors">
                  Tap to take a photo
                </p>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  or select from gallery
                </p>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      {file && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 relative z-10"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
              Your Name <span className="text-slate-600">(Optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full p-4 bg-slate-950/50 border border-slate-700/50 rounded-2xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-slate-600 font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
              Email Address <span className="text-slate-600">(Optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="w-full p-4 bg-slate-950/50 border border-slate-700/50 rounded-2xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-slate-600 font-medium"
            />
          </div>

          <button
            disabled={isUploading}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white rounded-2xl font-bold tracking-wide text-lg shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 active:translate-y-0"
          >
            {isUploading ? (
              <span className="flex items-center justify-center">
                <UploadCloud className="animate-bounce mr-3 w-6 h-6" />
                Uploading...
              </span>
            ) : (
              "Submit Photo"
            )}
          </button>
          {error && (
            <p className="text-rose-400 text-sm font-semibold text-center bg-rose-500/10 border border-rose-500/20 rounded-xl py-3 px-4">
              {error}
            </p>
          )}
        </motion.div>
      )}
    </form>
  );
}
