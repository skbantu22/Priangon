"use client";

import React, { useRef, useState } from "react";
import axios from "axios";
import { Mic, Square, Upload } from "lucide-react";
import { showToast } from "@/lib/showToast";

export default function VoiceOrderButton({
  product,
  variantId,
  color,
  size,
  quantity,
}) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();

      mediaRecorderRef.current = recorder;
      setRecording(true);

      showToast("success", "Recording started");
    } catch (error) {
      showToast("error", "Microphone permission denied");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: "audio/webm",
      });

      setAudioBlob(blob);

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      showToast("success", "Recording completed");
    };

    setRecording(false);
  };

  const submitVoiceOrder = async () => {
    try {
      if (!audioBlob) {
        return showToast("error", "Please record your voice first");
      }

      setLoading(true);

      // Upload audio file
      const uploadForm = new FormData();

      uploadForm.append("file", audioBlob, `voice-order-${Date.now()}.webm`);

      const uploadResponse = await axios.post("/api/upload-voice", uploadForm, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const voiceUrl = uploadResponse.data.secure_url;

      // Save order
      await axios.post("/api/voice-order", {
        productId: product?._id,
        productName: product?.name,
        variantId,
        color,
        size,
        quantity,
        voiceUrl,
      });

      showToast("success", "Voice order submitted");

      setAudioBlob(null);
      setAudioUrl("");
    } catch (error) {
      console.error(error);
      showToast("error", "Failed to submit voice order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 bg-gray-50 border  p-4">
      <p className="text-center text-sm text-gray-600 mb-4">
        Order এর জন্য আপনার নাম, ফোন নং,
        <br />
        লোকেশন বলবেন
      </p>

      {!recording && !audioBlob && (
        <button
          onClick={startRecording}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full transition"
        >
          <Mic size={18} />
          Start Recording
        </button>
      )}

      {recording && (
        <button
          onClick={stopRecording}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-full transition"
        >
          <Square size={18} />
          Stop Recording
        </button>
      )}

      {audioUrl && (
        <>
          <audio controls className="w-full mt-4">
            <source src={audioUrl} type="audio/webm" />
          </audio>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setAudioBlob(null);
                setAudioUrl("");
              }}
              className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-full transition"
            >
              <Mic size={18} />
              Record Again
            </button>

            <button
              type="button"
              onClick={submitVoiceOrder}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-black text-white font-bold py-3 rounded-full hover:bg-gray-800 disabled:opacity-50 transition"
            >
              <Upload size={18} />
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
