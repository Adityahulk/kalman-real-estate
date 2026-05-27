import type { VideoTask } from "./types";

const THUMBS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=70"
];

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export const VIDEO_TASKS: VideoTask[] = [
  {
    id: "vt-1",
    projectId: "mh",
    title: "Saldha Vrinda — Drone fly-through (raw)",
    brief:
      "Capture cinematic aerial fly-through showing entrance, central park, clubhouse rooftop and Block A waterfront facade. Golden hour preferred.",
    status: "Approved",
    assignedTo: "Omar Khurana",
    editor: "Leena Vohra",
    due: "2025-04-12",
    thumbnail: THUMBS[0],
    rawUrl: SAMPLE_VIDEO,
    editedUrl: SAMPLE_VIDEO,
    comments: [
      { by: "Sara Khanna", at: "2025-04-10T10:00:00Z", text: "Locked. Push to YouTube + Instagram Reels." }
    ]
  },
  {
    id: "vt-2",
    projectId: "mh",
    title: "Clubhouse construction milestone reel",
    brief:
      "30s vertical reel — show roof slab pour, structural progress, drone shot of MEP work. Add tasteful motion graphics with milestone date.",
    status: "Review",
    assignedTo: "Omar Khurana",
    editor: "Leena Vohra",
    due: "2025-05-30",
    thumbnail: THUMBS[1],
    rawUrl: SAMPLE_VIDEO,
    editedUrl: SAMPLE_VIDEO,
    comments: [
      { by: "Leena Vohra", at: "2025-05-26T13:11:00Z", text: "First cut uploaded. Music TBD." },
      { by: "Sara Khanna", at: "2025-05-27T08:02:00Z", text: "Color is too cool, warm it up by ~150K." }
    ]
  },
  {
    id: "vt-3",
    projectId: "mh",
    title: "Owner testimonial — Rajiv Bansal",
    brief: "10-minute sit-down interview, two-camera setup, B-roll of plot A-12.",
    status: "Editing",
    assignedTo: "Omar Khurana",
    editor: "Leena Vohra",
    due: "2025-06-08",
    thumbnail: THUMBS[2],
    rawUrl: SAMPLE_VIDEO,
    comments: []
  },
  {
    id: "vt-4",
    projectId: "pg",
    title: "ALP Family Park — drone walkthrough",
    brief: "Drone walkthrough at sunrise. Highlight kids' play zone.",
    status: "Raw Uploaded",
    assignedTo: "Omar Khurana",
    due: "2025-06-15",
    thumbnail: THUMBS[3],
    rawUrl: SAMPLE_VIDEO,
    comments: [{ by: "Omar Khurana", at: "2025-06-02T07:30:00Z", text: "Raw 8K footage uploaded — 14 clips." }]
  },
  {
    id: "vt-5",
    projectId: "pg",
    title: "Investor pitch — 90s teaser",
    brief: "Voice-over led, 90s teaser of ALP for IREX expo. Crisp typography.",
    status: "Shooting",
    assignedTo: "Omar Khurana",
    due: "2025-06-22",
    thumbnail: THUMBS[4],
    comments: []
  },
  {
    id: "vt-6",
    projectId: "dr",
    title: "Sushma Group — Phase 1 launch teaser",
    brief: "Master plan reveal animation + on-site sunrise drone. 60s YT pre-roll.",
    status: "Briefed",
    assignedTo: "Omar Khurana",
    due: "2025-07-10",
    thumbnail: THUMBS[5],
    comments: [{ by: "Sara Khanna", at: "2025-05-25T09:00:00Z", text: "Use the new brand intro sting." }]
  }
];
