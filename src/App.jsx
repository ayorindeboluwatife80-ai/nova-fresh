
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import {
  Home,
  Compass,
  Clapperboard,
  MessageCircle,
  UserRound,
  Camera,
  Zap,
  Plus,
  Settings,
  Heart,
  Send,
  MoreHorizontal,
  Bookmark,
} from "lucide-react";
import "./App.css";

const stories = [
  { name: "Your story", color: "#7953c8", own: true },
  { name: "Amara", color: "#e18aab" },
  { name: "Tomi", color: "#e7a66b" },
  { name: "Lebo", color: "#779bba" },
  { name: "Zara", color: "#b28bd5" },
  { name: "Mila", color: "#8ba78b" },
];

const posts = [
  {
    name: "amara.jpg",
    location: "Johannesburg, South Africa",
    image: "photo-1534528741775-53994a69daeb",
    caption: "A little reminder to enjoy the little things. ✨",
    likes: "2,481",
  },
  {
    name: "tomi",
    location: "Cape Town, South Africa",
    image: "photo-1524504388940-b1c1722653e1",
    caption: "Collecting moments, not things. 💜",
    likes: "1,203",
  },
];

function App() {
  const [page, setPage] = useState("Home");
  const [session, setSession] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const [authMode, setAuthMode] = useState("signup");
const [authName, setAuthName] = useState("");
const [authUsername, setAuthUsername] = useState("");
const [authEmail, setAuthEmail] = useState("");
const [authPassword, setAuthPassword] = useState("");
const [authError, setAuthError] = useState("");

  const [activeStory, setActiveStory] = useState(null);
  const [storyMedia, setStoryMedia] = useState(null);
  const [publishedStories, setPublishedStories] = useState([]);
  const [liveStories, setLiveStories] = useState([]);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});

  const [profile, setProfile] = useState({
  name: "",
  username: "",
  bio: "",
  avatar: "",
});


useEffect(() => {
  const updateUserProfile = (currentSession) => {
    const user = currentSession?.user;

    if (!user) {
      setProfile({
        name: "",
        username: "",
        bio: "",
        avatar: "",
      });
      return;
    }

    setProfile({
      name: user.user_metadata?.display_name || "",
      username: user.user_metadata?.username || "",
      bio: "",
      avatar: "",
    });
  };

  supabase.auth.getSession().then(({ data, error }) => {
    console.log("NOVA SESSION:", data?.session);

    if (error) console.error(error);

    const currentSession = data?.session ?? null;
    setSession(currentSession);
    updateUserProfile(currentSession);
    setAuthLoading(false);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession);
    updateUserProfile(newSession);
  });

  return () => subscription.unsubscribe();
}, []);


  const [cameraMode, setCameraMode] = useState("photo");
const [activeFilter, setActiveFilter] = useState("normal");
const [isRecording, setIsRecording] = useState(false);

const mediaRecorderRef = useRef(null);
const recordedChunksRef = useRef([]);
const cameraStreamRef = useRef(null);
const recordingCanvasRef = useRef(null);
const animationFrameRef = useRef(null);
  
const filters = [
  { name: "Normal", value: "normal", css: "none" },
  { name: "Warm", value: "warm", css: "sepia(0.3) saturate(1.4)" },
  { name: "B&W", value: "mono", css: "grayscale(1)" },
  { name: "Dreamy", value: "dreamy", css: "brightness(1.15) saturate(1.3) contrast(0.9)" },
  { name: "Glow", value: "glow", css: "brightness(1.15) saturate(1.5) drop-shadow(0 0 8px #c084fc)" },
];

const selectedFilter =
  filters.find(filter => filter.value === activeFilter) || filters[0];
  const [livePosts, setLivePosts] = useState([]);
const [postsLoading, setPostsLoading] = useState(true);

const videoRef = useRef(null);
const [cameraError, setCameraError] = useState("");
const [cameraFacing, setCameraFacing] = useState("user");

async function handleAuth(event) {
  event.preventDefault();
  setAuthError("");

  try {
    if (authMode === "signup") {
      if (!authUsername.trim() || !authName.trim()) {
        throw new Error("Please enter your name and username.");
      }

      const { error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            username: authUsername.trim().toLowerCase(),
            display_name: authName.trim(),
          },
        },
      });

      if (error) throw error;

      alert("Account created! Check your email if confirmation is required.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (error) throw error;
    }
  } catch (error) {
    setAuthError(error.message);
  }
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  setPage("Home");
}

function capturePhoto() {
  const video = videoRef.current;

  if (!video || video.readyState < 2) {
    alert("Camera is not ready yet. Try again.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  context.filter = selectedFilter.css;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const photo = canvas.toDataURL("image/png");

  setStoryMedia({
    url: photo,
    type: "image/png",
  });

  setActiveStory({
    name: "Your story",
    color: "#7953c8",
    own: true,
  });
}

async function publishStory() {
  if (!storyMedia) return;

  try {
    const response = await fetch(storyMedia.url);
    const blob = await response.blob();

    const extension = blob.type.includes("video") ? "webm" : "png";
    const filePath = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("nova-stories")
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: databaseError } = await supabase
      .from("stories")
      .insert({
        media_path: filePath,
        media_type: blob.type.includes("video") ? "video" : "image",
        text_content: "",
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
      });

    if (databaseError) throw databaseError;

    alert("Your NOVA Story has been published! 💜");

    setStoryMedia(null);
    setActiveStory(null);
    setPage("Home");

  } catch (error) {
    console.error("Story publishing error:", error);
    alert(`Couldn't publish your Story: ${error.message}`);
  }
}
function startRecording() {
  const video = videoRef.current;

  if (!video || video.readyState < 2) {
    alert("Camera is not ready yet.");
    return;
  }

  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    alert("Video recording is not supported by this browser.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  recordingCanvasRef.current = canvas;

  const context = canvas.getContext("2d");

  function drawFrame() {
    if (!videoRef.current || !recordingCanvasRef.current) return;

    context.filter = selectedFilter.css;
    context.drawImage(
      videoRef.current,
      0,
      0,
      canvas.width,
      canvas.height
    );

    animationFrameRef.current = requestAnimationFrame(drawFrame);
  }

  drawFrame();

  const canvasStream = canvas.captureStream(30);
  recordedChunksRef.current = [];

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const recorder = new MediaRecorder(canvasStream, { mimeType });

  mediaRecorderRef.current = recorder;

  recorder.ondataavailable = event => {
    if (event.data.size > 0) {
      recordedChunksRef.current.push(event.data);
    }
  };

  recorder.onstop = () => {
    const videoBlob = new Blob(recordedChunksRef.current, {
      type: "video/webm",
    });

    const videoUrl = URL.createObjectURL(videoBlob);

    setStoryMedia({
      url: videoUrl,
      type: "video/webm",
    });

    setActiveStory({
      name: "Your story",
      color: "#7953c8",
      own: true,
    });

    canvasStream.getTracks().forEach(track => track.stop());

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsRecording(false);
  };

  recorder.start();
  setIsRecording(true);
}

function stopRecording() {
  if (mediaRecorderRef.current?.state === "recording") {
    mediaRecorderRef.current.stop();
  }
}

useEffect(() => {
  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("NOVA feed error:", error.message);
    } else {
      setLivePosts(data || []);
    }

    setPostsLoading(false);
  }

  loadPosts();
}, []);

useEffect(() => {
  async function loadStories() {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("NOVA Stories error:", error.message);
      return;
    }

    const storiesWithUrls = await Promise.all(
      (data || []).map(async (story) => {
        const { data: fileData, error: fileError } =
          await supabase.storage
            .from("nova-stories")
            .createSignedUrl(story.media_path, 3600);

        if (fileError) {
          console.error("Story media error:", fileError.message);
          return null;
        }

        return {
          id: story.id,
          name: "NOVA user",
          color: "#7953c8",
          own: false,
          media: {
            url: fileData.signedUrl,
            type: story.media_type,
          },
        };
      })
    );

    setLiveStories(storiesWithUrls.filter(Boolean));
  }

  loadStories();
}, []);

useEffect(() => {
  if (page !== "Camera") return;

  let stream;

  async function startCamera() {
    try {
      setCameraError("");

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        "Camera access denied or unavailable. Check browser permissions."
      );
    }
  }

  startCamera();

  return () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    stream?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
  };
}, [page, cameraFacing]);

  const navigation = [
    { name: "Home", icon: Home },
    { name: "Explore", icon: Compass },
    { name: "Reels", icon: Clapperboard },
    { name: "Messages", icon: MessageCircle },
    { name: "Profile", icon: UserRound },
  ];

  if (authLoading) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>NOVA<span className="purple">.</span></h1>
        <p>Getting your space ready...</p>
      </div>
    </div>
  );
}

if (false && !session) {
  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleAuth}>
        <div className="auth-logo">
          <Zap size={30} fill="white" />
        </div>

        <h1>NOVA<span className="purple">.</span></h1>
        <p className="auth-subtitle">
          Your people. Your moments. Your space.
        </p>

        <div className="auth-switch">
          <button
            type="button"
            className={authMode === "signup" ? "selected" : ""}
            onClick={() => {
              setAuthMode("signup");
              setAuthError("");
            }}
          >
            Create account
          </button>

          <button
            type="button"
            className={authMode === "login" ? "selected" : ""}
            onClick={() => {
              setAuthMode("login");
              setAuthError("");
            }}
          >
            Log in
          </button>
        </div>

        {authMode === "signup" && (
          <>
            <input
              placeholder="Your name"
              value={authName}
              onChange={e => setAuthName(e.target.value)}
              required
            />

            <input
              placeholder="Choose a username"
              value={authUsername}
              onChange={e => setAuthUsername(e.target.value)}
              required
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={authEmail}
          onChange={e => setAuthEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={authPassword}
          onChange={e => setAuthPassword(e.target.value)}
          minLength={6}
          required
        />

        {authError && <p className="auth-error">{authError}</p>}

        <button className="auth-submit" type="submit">
          {authMode === "signup" ? "Create your NOVA account" : "Log in to NOVA"}
        </button>

        <p className="auth-footer">
          Made for your moments. 💜
        </p>
      </form>
    </div>
  );
}

return (
  <div className="app nova-universe">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Zap size={23} fill="white" /></div>
          <span>NOVA<span className="purple">.</span></span>
        </div>

        <button className="create-button" onClick={() => setPage("Create")}>
          <Plus size={19} /> Create
        </button>

        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => {
  console.log("Clicked:", name);
  setPage(name);
}}
            >
              <Icon size={21} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setPage("Camera")}>
            <Camera size={21} /> Camera
          </button>
          <button className="nav-item" onClick={() => setPage("Settings")}>
            <Settings size={21} /> Settings
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">NOVA<span className="purple">.</span></div>
          <div className="top-actions">
            <button onClick={() => setPage("Notifications")}>
              <Heart size={21} />
            </button>
            <button onClick={() => setPage("Messages")}>
              <Send size={21} />
            </button>
          </div>
        </header>

        {page === "Home" ? (
          <div className="feed-layout">
            <section className="feed">
              <div className="stories">
                {[...publishedStories, ...liveStories, ...stories].map((story) => (
                 <button
  className="story"
 key={story.id || story.name}
  onClick={() => {
    setStoryMedia(story.media || null);
  console.log("Story clicked:", story);
  setActiveStory(story);
}}
>
                    <div className="story-ring">
                      <div className="story-avatar" style={{ background: story.color }}>
                        {story.media ? (
  story.media.type.startsWith("video/") ? "▶" : "✦"
) : story.own ? (
  <Plus size={24} />
) : (
  story.name[0]
)}
                      </div>
                    </div>
                    <span>{story.name}</span>
                  </button>
                ))}
              </div>

              <div className="feed-heading">
                <div>
                  <h2>Your feed</h2>
                  <p>See what's happening around you.</p>
                </div>
                <button className="icon-button"><MoreHorizontal /></button>
              </div>

              {(livePosts.length ? livePosts : posts).map((post, index) => (
                <article className="post" key={post.name}>
                  <div className="post-header">
                    <div className="post-avatar">
  {(post.name || post.username || "N")[0].toUpperCase()}
</div>
                    <div className="post-user">
                     <strong>{post.name || post.username || "NOVA user"}</strong>
<span>{post.location || "NOVA"}</span>
                    </div>
                    <button className="icon-button"><MoreHorizontal /></button>
                  </div>

                  <img
                    className="post-image"
                    src={`https://images.unsplash.com/${post.image}?auto=format&fit=crop&w=900&q=85`}
                    alt="Social post"
                  />

                  <div className="post-actions">
                    <div>
                      <button onClick={() => setLiked(p => ({ ...p, [index]: !p[index] }))}>
                        <Heart color={liked[index] ? "#ed4777" : "currentColor"} fill={liked[index] ? "#ed4777" : "none"} />
                      </button>
                      <button><MessageCircle /></button>
                      <button><Send /></button>
                    </div>
                    <button onClick={() => setSaved(p => ({ ...p, [index]: !p[index] }))}>
                      <Bookmark fill={saved[index] ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="post-caption">
                    <strong>{liked[index] ? "2,482" : post.likes} likes</strong>
                    <p><b>{post.name}</b> {post.caption}</p>
                    <span>View all comments</span>
                  </div>
                </article>
              ))}
            </section>

            <aside className="right-panel">
              <h3>Your space.</h3>
              <p>Find your people. Share your moments.</p>
              <div className="suggestion">
                <div className="suggestion-avatar">A</div>
                <div><b>Amara</b><span>Suggested for you</span></div>
                <button>Follow</button>
              </div>
              <div className="suggestion">
                <div className="suggestion-avatar">L</div>
                <div><b>Lebo</b><span>Suggested for you</span></div>
                <button>Follow</button>
              </div>
              <div className="nova-note">
                <Zap size={18} />
                <b>Made for your moments.</b>
                <span>Welcome to NOVA.</span>
              </div>
            </aside>
          </div>
                  ) : page === "Camera" ? (
          <section className="camera-screen">
            <div className="camera-top">
              <button onClick={() => setPage("Home")}>✕</button>
              <h2>NOVA CAMERA</h2>
              <button onClick={() => setPage("Settings")}>
                <Settings size={22} />
              </button>
            </div>

            <div className="camera-preview">
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    style={{ filter: selectedFilter.css }}
  />

  {cameraError && <p>{cameraError}</p>}

  {isRecording && (
    <div className="recording-indicator">
      <span /> REC
    </div>
  )}
</div>

           <div className="camera-mode-switch">
  <button
    className={cameraMode === "photo" ? "selected" : ""}
    onClick={() => setCameraMode("photo")}
  >
    PHOTO
  </button>

  <button
    className={cameraMode === "video" ? "selected" : ""}
    onClick={() => setCameraMode("video")}
  >
    VIDEO
  </button>
</div>

<div className="camera-filters">
  {filters.map(filter => (
    <button
      key={filter.value}
      className={activeFilter === filter.value ? "active-filter" : ""}
      onClick={() => setActiveFilter(filter.value)}
    >
      {filter.name}
    </button>
  ))}
</div>

<div className="camera-controls">
  <button onClick={() => setPage("Home")}>Gallery</button>

  {cameraMode === "photo" ? (
    <button
      className="capture-button"
      aria-label="Capture photo"
      onClick={capturePhoto}
    />
  ) : (
    <button
      className={`capture-button video-capture ${isRecording ? "recording" : ""}`}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
      onClick={isRecording ? stopRecording : startRecording}
    />
  )}

  <button
    onClick={() =>
      setCameraFacing(current =>
        current === "user" ? "environment" : "user"
      )
    }
  >
    Flip
  </button>
</div>
          </section>
       
) : page === "Profile" ? (
  <section className="profile-page">
    <div className="profile-header">
      <div className="profile-avatar">
        {profile.name
          ? profile.name[0].toUpperCase()
          : "N"}
      </div>

      <div className="profile-details">
        <h1>{profile.name || "Your Name"}</h1>
        <p>@{profile.username || "yourusername"}</p>
        <p>{profile.bio || "Welcome to my NOVA space ✨"}</p>

        <div className="profile-stats">
          <span><strong>0</strong> posts</span>
          <span><strong>0</strong> followers</span>
          <span><strong>0</strong> following</span>
        </div>

        <button
          className="edit-profile-button"
          onClick={() => {
            const name = window.prompt("Your display name:", profile.name);
            if (name === null) return;

            const username = window.prompt(
              "Your username:",
              profile.username
            );
            if (username === null) return;

            const bio = window.prompt("Your bio:", profile.bio);
            if (bio === null) return;

            setProfile(prev => ({
              ...prev,
              name,
              username: username.replace("@", "").trim(),
              bio,
            }));
          }}
        >
          Edit Profile
        </button>
      </div>
    </div>

    <div className="profile-posts-heading">
      <h2>Your Posts</h2>
    </div>

    <div className="profile-empty">
      <div className="placeholder-icon">
        <Camera size={30} />
      </div>
      <h2>Your story starts here.</h2>
      <p>Your published posts will appear here.</p>
      <button onClick={() => setPage("Camera")}>
        Create a post
      </button>
    </div>
  </section>

) : page === "Settings" ? (
  <section className="settings-page">
    <h1>Settings</h1>
    <p>Manage your NOVA experience.</p>

    <div className="settings-section">
      <h3>Account</h3>
      <p>Manage your profile and account preferences.</p>
    </div>

    <div className="settings-section">
      <h3>Privacy & Security</h3>
      <p>Manage your privacy and security preferences.</p>
    </div>

    <div className="settings-section">
      <h3>Notifications</h3>
      <p>Manage how NOVA keeps you updated.</p>
    </div>

    <button
      className="logout-button"
      onClick={handleLogout}
    >
      Log out
    </button>
  </section>
) : (
  <section className="placeholder">
    <div className="placeholder-icon"><Zap size={32} /></div>
    <h1>{page}</h1>
    <p>Your {page.toLowerCase()} space is being built.</p>
    <button onClick={() => setPage("Home")}>Back to Home</button>
  </section>
)}

</main>

      
      <div className="mobile-nav">
        {navigation.map(({ name, icon: Icon }) => (
          <button key={name} onClick={() => setPage(name)}>
            <Icon size={22} />
          </button>
        ))}
        <button onClick={() => setPage("Camera")}><Camera size={23} /></button>
      </div>
      {activeStory && (
        <div className="story-viewer">
          <div className="story-viewer-content">
            <button
              className="story-close"
              onClick={() => setActiveStory(null)}
            >
              ×
            </button>
            
            <div className="story-viewer-user">
              <div
                className="story-avatar"
                style={{ background: activeStory.color }}
              >
                {activeStory.name[0]}
              </div>
              <strong>{activeStory.name}</strong>
            </div>

           {storyMedia ? (
  storyMedia.type.startsWith("video/") ? (
    <video
      src={storyMedia.url}
      controls
      autoPlay
      className="story-media-preview"
    />
  ) : (
    <img
      src={storyMedia.url}
      alt="Story preview"
      className="story-media-preview"
    />
  )
) : (
  <div className="story-viewer-message">
    {activeStory.own
      ? "Share your first NOVA Story ✨"
      : `${activeStory.name}'s Story`}
  </div>
)}

{activeStory.own && (
  <label className="story-upload-button">

    {activeStory.own && storyMedia && (
  <button
    className="story-upload-button"
    onClick={publishStory}
  >
    Share to NOVA Story ✨
  </button>
)}
    <Plus size={18} /> Choose photo or video
    <input
      type="file"
      accept="image/*,video/*"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          setStoryMedia({
            url: URL.createObjectURL(file),
            type: file.type,
          });
        }
      }}
    />
  </label>

  

)}
  
<div className="story-navigation">
  <button
    onClick={() => {
      const index = stories.findIndex(s => s.name === activeStory.name);
      setActiveStory(stories[(index - 1 + stories.length) % stories.length]);
    }}
  >
    ‹
  </button>

  <button
    onClick={() => {
      const index = stories.findIndex(s => s.name === activeStory.name);
      setActiveStory(stories[(index + 1) % stories.length]);
    }}
  >
    ›
  </button>
</div>
          </div>
        </div>
      )}

    


    </div>


  );
}


export default App;
