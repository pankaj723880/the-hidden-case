"use client";

import toast from "react-hot-toast";

export default function ShareButtons({ postTitle, postUrl }) {
  const twitterUrl =
    "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(postTitle) +
    "&url=" +
    encodeURIComponent(postUrl);
  const whatsappUrl =
    "https://wa.me/?text=" + encodeURIComponent(`${postTitle} ${postUrl}`);
  const facebookUrl =
    "https://www.facebook.com/sharer/sharer.php?u=" +
    encodeURIComponent(postUrl);
  const linkedinUrl =
    "https://www.linkedin.com/sharing/share-offsite/?url=" +
    encodeURIComponent(postUrl);

  const copyLink = async () => {
    await navigator.clipboard.writeText(postUrl);
    toast.success("Link copied! 🔗");
  };

  const openShareWindow = (url, features = "") => {
    window.open(url, "_blank", features);
  };

  const buttonClass =
    "rounded-full border px-3 py-2 text-xs font-bold transition hover:shadow-[0_0_18px_rgba(122,79,45,0.18)]";

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={copyLink}
        className={buttonClass}
        style={{
          backgroundColor: "var(--bg2)",
          borderColor: "var(--border)",
          color: "var(--text2)",
        }}
      >
        🔗 Copy Link
      </button>
      <button
        type="button"
        onClick={() => openShareWindow(twitterUrl, "width=600,height=400")}
        className={buttonClass}
        style={{
          backgroundColor: "var(--bg2)",
          borderColor: "var(--border)",
          color: "var(--text2)",
        }}
      >
        X
      </button>
      <button
        type="button"
        onClick={() => openShareWindow(whatsappUrl)}
        className={buttonClass}
        style={{
          backgroundColor: "var(--bg2)",
          borderColor: "var(--border)",
          color: "var(--text2)",
        }}
      >
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => openShareWindow(facebookUrl, "width=600,height=400")}
        className={buttonClass}
        style={{
          backgroundColor: "var(--bg2)",
          borderColor: "var(--border)",
          color: "var(--text2)",
        }}
      >
        Facebook
      </button>
      <button
        type="button"
        onClick={() => openShareWindow(linkedinUrl, "width=600,height=400")}
        className={buttonClass}
        style={{
          backgroundColor: "var(--bg2)",
          borderColor: "var(--border)",
          color: "var(--text2)",
        }}
      >
        LinkedIn
      </button>
    </div>
  );
}
