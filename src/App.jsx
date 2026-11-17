
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
function getPostImage(post) {
  return post?.image_url || post?.image || post?.media_url || "";
}
  

  

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

  const [activePost, setActivePost] = useState(null);
const [comments, setComments] = useState([]);
const [commentText, setCommentText] = useState("");
const [commentsLoading, setCommentsLoading] = useState(false);

async function openComments(post) {
  setActivePost(post);
  setComments([]);
  setCommentText("");
  setCommentsLoading(true);

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", post.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading comments:", error);
    alert("Couldn't load comments. Please try again.");
    } else {
    const commentRows = data || [];
    const profileIds = [
      ...new Set(commentRows.map(comment => comment.profile_id))
    ];

    let profilesById = {};

    if (profileIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", profileIds);

      if (profileError) {
        console.error("Profile loading error:", profileError);
      } else {
        profilesById = Object.fromEntries(
          (profileData || []).map(profile => [profile.id, profile])
        );
      }
    }

    setComments(
      commentRows.map(comment => ({
        ...comment,
        profile: profilesById[comment.profile_id] || null
      }))
    );
  }

  setCommentsLoading(false);
}

async function addComment() {
  if (!commentText.trim() || !activePost?.id) return;

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: activePost.id,
      profile_id: session.user.id,
      content: commentText.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding comment:", error);
    alert("Couldn't post your comment. Please try again.");
    return;
  }

  setComments((current) => [
  ...current,
  {
    ...data,
    profile: {
      display_name: profile.name,
      username: profile.username,
      avatar_url: profile.avatar,
    },
  },
]);
  setCommentText("");
}

const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
const avatarFileRef = useRef(null);
const postFileRef = useRef(null);

  const [profile, setProfile] = useState({
  name: "",
  username: "",
  bio: "",
  avatar: "",
});



useEffect(() => {
  const updateUserProfile = async (currentSession) => {
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

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("NOVA profile loading error:", error);
    }

    setProfile({
      name: data?.display_name || user.user_metadata?.display_name || "",
      username: data?.username || user.user_metadata?.username || "",
      bio: data?.bio || "",
      avatar: data?.avatar_url || "",
    });
  };

  supabase.auth.getSession().then(({ data, error }) => {
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
  const [flicks, setFlicks] = useState([]);
  const [flickLiked, setFlickLiked] = useState({});
  const [flickLikeCounts, setFlickLikeCounts] = useState({});

  const [activeFlick, setActiveFlick] = useState(null);
const [flickComments, setFlickComments] = useState([]);
const [flickCommentText, setFlickCommentText] = useState("");
const [flickCommentsLoading, setFlickCommentsLoading] = useState(false);
const [flicksLoading, setFlicksLoading] = useState(false);
const flicksFileRef = useRef(null);
const flicksFeedRef = useRef(null);
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


async function uploadAvatar(event) {
  const file = event.target.files?.[0];

  if (!file || !session?.user) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Please choose an image smaller than 5 MB.");
    return;
  }

  try {
    const filePath = `${session.user.id}/${crypto.randomUUID()}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicData.publicUrl;

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        username: profile.username,
        display_name: profile.name,
        bio: profile.bio,
        avatar_url: avatarUrl,
      });

    if (profileError) throw profileError;

    setProfile(prev => ({
      ...prev,
      avatar: avatarUrl,
    }));

    alert("Your NOVA profile picture has been updated! 💜");
  } catch (error) {
    console.error("Avatar upload error:", error);
    alert(`Couldn't upload your picture: ${error.message}`);
  }

  event.target.value = "";
}

async function uploadFeedPost(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (!session?.user?.id) {
      alert("Please sign in before publishing.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Please choose an image smaller than 10MB.");
      return;
    }

    const caption = prompt("Write a caption for your post:") || "";
    const extension = file.name.split(".").pop() || "jpg";
    const path = `${session.user.id}/posts/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("story-media")
      .upload(path, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: signedData, error: urlError } = await supabase.storage
      .from("story-media")
      .createSignedUrl(path, 86400);

    if (urlError) throw urlError;

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: session.user.id,
        image_url: signedData.signedUrl,
        caption,
      })
      .select()
      .single();

    if (error) throw error;

    setLivePosts(current => [
      {
        ...data,
        profile: {
          display_name: profile.name,
          username: profile.username,
          avatar_url: profile.avatar,
        },
      },
      ...current,
    ]);

    setPage("Home");
    alert("Your post has been published! 💜");
  } catch (error) {
    console.error("Post upload failed:", error);
    alert(error.message || "Couldn't publish your post.");
  } finally {
    event.target.value = "";
  }
}

async function toggleFlickLike(flick) {
    if (flick.featured) {
    setFlickLiked(current => ({
      ...current,
      [flick.id]: !current[flick.id],
    }));

    setFlickLikeCounts(current => ({
      ...current,
      [flick.id]: Math.max(
        0,
        (current[flick.id] || 0) + (current[flick.id] ? -1 : 1)
      ),
    }));

    return;
  }
  if (!session?.user?.id) {
    alert("Please log in to like FLICKS.");
    return;
  }

  const alreadyLiked = !!flickLiked[flick.id];

  // Update the screen immediately
  setFlickLiked(current => ({
    ...current,
    [flick.id]: !alreadyLiked,
  }));

  setFlickLikeCounts(current => ({
    ...current,
    [flick.id]: Math.max(
      0,
      (current[flick.id] || 0) + (alreadyLiked ? -1 : 1)
    ),
  }));

  const request = alreadyLiked
    ? supabase
        .from("flick_likes")
        .delete()
        .eq("flick_id", flick.id)
        .eq("profile_id", session.user.id)
    : supabase
        .from("flick_likes")
        .insert({
          flick_id: flick.id,
          profile_id: session.user.id,
        });

  const { error } = await request;

  if (error) {
    // Restore the previous state if saving fails
    setFlickLiked(current => ({
      ...current,
      [flick.id]: alreadyLiked,
    }));

    setFlickLikeCounts(current => ({
      ...current,
      [flick.id]: Math.max(
        0,
        (current[flick.id] || 0) + (alreadyLiked ? 1 : -1)
      ),
    }));

    console.error("FLICK like error:", error.message);
    alert("Couldn't update your like. Please try again.");
  }
}

async function openFlickComments(flick) {
  if (flick.featured) {
  setActiveFlick(flick);
  setFlickComments([]);
  setFlickCommentText("");
  setFlickCommentsLoading(false);
  return;
}
  setActiveFlick(flick);
  setFlickComments([]);
  setFlickCommentText("");
  setFlickCommentsLoading(true);

  try {
    const { data, error } = await supabase
      .from("flick_comments")
      .select("*")
      .eq("flick_id", flick.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const userIds = [...new Set((data || []).map(comment => comment.profile_id))];

    let profilesById = {};

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      profilesById = Object.fromEntries(
        (profilesData || []).map(profile => [profile.id, profile])
      );
    }

    setFlickComments(
      (data || []).map(comment => ({
        ...comment,
        profile: profilesById[comment.profile_id] || null,
      }))
    );
  } catch (error) {
    console.error("FLICK comments error:", error.message);
    alert("Couldn't load comments. Please try again.");
  } finally {
    setFlickCommentsLoading(false);
  }
}

async function addFlickComment(event) {
  event.preventDefault();

  if (!session?.user?.id) {
    alert("Please log in to comment.");
    return;
  }

  if (!flickCommentText.trim() || !activeFlick) return;

  const content = flickCommentText.trim();

  const { data, error } = await supabase
    .from("flick_comments")
    .insert({
      flick_id: activeFlick.id,
      profile_id: session.user.id,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error("FLICK comment error:", error.message);
    alert("Couldn't send your comment.");
    return;
  }

  setFlickComments(current => [
    ...current,
    {
      ...data,
      profile: {
        display_name: profile.name,
        username: profile.username,
        avatar_url: profile.avatar,
      },
    },
  ]);

  setFlickCommentText("");
}

async function uploadFlick(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (!session?.user?.id) {
      alert("Please sign in before publishing.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      alert("Please choose a video.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert("Please choose a video smaller than 50MB.");
      return;
    }

    const caption = prompt("Write a caption for your FLICK:") || "";
    const extension = file.name.split(".").pop() || "mp4";
    const path = `${session.user.id}/flicks/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("story-media")
      .upload(path, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: signedData, error: urlError } = await supabase.storage
      .from("story-media")
      .createSignedUrl(path, 86400);

    if (urlError) throw urlError;

    const { data, error } = await supabase
      .from("flicks")
      .insert({
        user_id: session.user.id,
        video_path: path,
        caption,
      })
      .select()
      .single();

    if (error) throw error;

    setFlicks(current => [
      {
        ...data,
        video_url: signedData.signedUrl,
        profile: {
          display_name: profile.name,
          username: profile.username,
          avatar_url: profile.avatar,
        },
      },
      ...current,
    ]);

    setPage("Reels");
    alert("Your FLICK has been published! 💜");
  } catch (error) {
    console.error("FLICK upload failed:", error);
    alert(error.message || "Couldn't publish your FLICK.");
  } finally {
    event.target.value = "";
  }
}


async function saveProfile() {
  if (!session?.user) {
    alert("Please log in first.");
    return;
  }

  const updatedProfile = {
    id: session.user.id,
    username: profile.username.trim().replace("@", ""),
    display_name: profile.name.trim(),
    bio: profile.bio.trim(),
    avatar_url: profile.avatar || null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(updatedProfile);

  if (error) {
    console.error("Profile saving error:", error);
    alert(`Couldn't save your profile: ${error.message}`);
    return false;
  }

  alert("Your NOVA profile has been saved! 💜");
  return true;
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
      .from("story-media")
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: databaseError } = await supabase
      .from("stories")
      .insert({
  user_id: session.user.id,
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
  const refreshedPosts = await Promise.all(
    (data || []).map(async (post) => {
      const originalImageUrl =
        post.image_url || post.image || post.media_url;

      if (!originalImageUrl) return post;

      try {
        const parsedUrl = new URL(originalImageUrl);
        const marker = "/object/sign/story-media/";
        const markerIndex = parsedUrl.pathname.indexOf(marker);

        if (markerIndex === -1) return post;

        const storagePath = decodeURIComponent(
          parsedUrl.pathname.slice(markerIndex + marker.length)
        );

        console.log("NOVA STORAGE PATH:", storagePath);

        const { data: signedImage, error: signedError } =
          await supabase.storage
            .from("story-media")
            .createSignedUrl(storagePath, 3600);

        if (signedError) {
          console.error("NOVA image refresh error:", signedError.message);
          return post;
        }

        return {
          ...post,
          image_url: signedImage.signedUrl,
        };
      } catch (imageError) {
        console.error("NOVA image error:", imageError);
        return post;
      }
    })
  );

  
const userIds = [
  ...new Set(refreshedPosts.map(post => post.user_id).filter(Boolean))
];

let profilesById = {};

if (userIds.length > 0) {
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  if (profileError) {
    console.error("NOVA post profiles error:", profileError);
  } else {
    profilesById = Object.fromEntries(
      (profileData || []).map(item => [item.id, item])
    );
  }
}

setLivePosts(
  refreshedPosts.map(post => ({
    ...post,
    profile: profilesById[post.user_id] || null,
  }))
);

}
  }

  loadPosts();
}, []);


useEffect(() => {
  async function loadFlicks() {
    setFlicksLoading(true);

    try {
      const { data, error } = await supabase
        .from("flicks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

// Load likes for all FLICKS
const { data: likesData, error: likesError } = await supabase
  .from("flick_likes")
  .select("flick_id, profile_id");

if (likesError) throw likesError;

const currentUserId = session?.user?.id;

const likeCounts = {};
const likedByMe = {};

(likesData || []).forEach(like => {
  likeCounts[like.flick_id] = (likeCounts[like.flick_id] || 0) + 1;

  if (like.profile_id === currentUserId) {
    likedByMe[like.flick_id] = true;
  }
});

setFlickLikeCounts(likeCounts);
setFlickLiked(likedByMe);

const userIds = [
        ...new Set((data || []).map(flick => flick.user_id))
      ];

      let profilesById = {};

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds);

        if (profileError) throw profileError;

        profilesById = Object.fromEntries(
          (profileData || []).map(item => [item.id, item])
        );
      }

      const flicksWithUrls = await Promise.all(
        (data || []).map(async flick => {
          const { data: fileData, error: fileError } =
            await supabase.storage
              .from("story-media")
              .createSignedUrl(flick.video_path, 3600);

          if (fileError) {
            console.error("FLICKS video error:", fileError.message);
            return null;
          }

          return {
  ...flick,
  video_url: fileData.signedUrl,
  profile: profilesById[flick.user_id] || null,
  likes_count: likeCounts[flick.id] || 0,
  liked_by_me: !!likedByMe[flick.id],
};
        })
      );

      setFlicks(flicksWithUrls.filter(Boolean));
    } catch (error) {
      console.error("NOVA FLICKS error:", error.message);
    } finally {
      setFlicksLoading(false);
    }
  }

  loadFlicks();
}, []);


useEffect(() => {
  if (page !== "Reels") return;

  const container = flicksFeedRef.current;
  if (!container) return;

  const videos = container.querySelectorAll("video");

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const video = entry.target;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: [0, 0.65, 1] }
  );

  videos.forEach(video => observer.observe(video));

  return () => observer.disconnect();
}, [page, flicks]);


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


const userIds = [
  ...new Set((data || []).map(story => story.user_id))
];

let profilesById = {};

if (userIds.length > 0) {
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  if (profileError) {
    console.error("NOVA story profiles error:", profileError);
  } else {
    profilesById = Object.fromEntries(
      (profileData || []).map(item => [item.id, item])
    );
  }
}

const storiesWithUrls = await Promise.all(
  (data || []).map(async (story) => {
    const { data: fileData, error: fileError } = await supabase.storage
      .from("story-media")
      .createSignedUrl(story.media_path, 3600);

    if (fileError) {
      console.error("Story media error:", fileError.message);
      return null;
    }

    const owner = profilesById[story.user_id];

    return {
      id: story.id,
      name: owner?.display_name || owner?.username || "NOVA user",
      color: "#7953c8",
      avatar: owner?.avatar_url || "",
      own: story.user_id === session?.user?.id,
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
  { name: "Home", label: "Home", icon: Home },
  { name: "Explore", label: "ORBIT", icon: Compass },
  { name: "Reels", label: "FLICKS", icon: Clapperboard },
  { name: "Messages", label: "PULSE", icon: MessageCircle },
  { name: "Profile", label: "Profile", icon: UserRound },
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
}111

if (!session) {
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

        <button
  className="create-button"
  onClick={() => postFileRef.current?.click()}
>
  <Zap size={19} /> SPARK
</button>

        <nav>
          {navigation.map(({ name, label, icon: Icon }) => ( 
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => {
  console.log("Clicked:", name);
  setPage(name);
}}
            >
              <Icon size={21} />
              <span>{label}</span>
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
  {story.avatar ? (
    <img src={story.avatar} alt={story.name} />
  ) : story.media ? (
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
  {post.profile?.avatar_url ? (
    <img
      src={post.profile.avatar_url}
      alt="Profile"
    />
  ) : (
    (post.profile?.display_name || post.name || post.username || "N")[0].toUpperCase()
  )}
</div>

                    <div className="post-user">
                     <strong>
  {post.profile?.display_name || post.profile?.username || post.name || post.username || "NOVA user"}
</strong>
<span>{post.location || "NOVA"}</span>
                    </div>
                    <button className="icon-button"><MoreHorizontal /></button>
                  </div>

                  
{getPostImage(post) ? (
  <img
    className="post-image"
    src={getPostImage(post)}
    alt="Social post"
  />
) : (
  <div className="post-image">Image unavailable</div>
)}
                  <div className="post-actions">
                    <div>
                      <button onClick={() => setLiked(p => ({ ...p, [index]: !p[index] }))}>
                        <Heart color={liked[index] ? "#ed4777" : "currentColor"} fill={liked[index] ? "#ed4777" : "none"} />
                      </button>
                      <button onClick={() => openComments(post)}>
  <MessageCircle />
</button>
                      <button><Send /></button>
                    </div>
                    <button onClick={() => setSaved(p => ({ ...p, [index]: !p[index] }))}>
                      <Bookmark fill={saved[index] ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="post-caption">
                    <strong>{liked[index] ? "2,482" : post.likes} likes</strong>
                    <p><b>{post.name}</b> {post.caption}</p>
                    <span onClick={() => openComments(post)} style={{ cursor: "pointer" }}>
  View all comments
</span>
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

) : page === "Explore" ? (
  <section className="explore-page">
    <div className="explore-header">
      <h2>ORBIT</h2>
      <p>Explore the universe of NOVA.</p>
    </div>

    <div className="explore-grid">
      {(livePosts.length ? livePosts : posts).map((post, index) => (
        <button
          className="explore-post"
          key={post.id || index}
          onClick={() => setActivePost(post)}
        >
          {getPostImage(post) ? (
            <img src={getPostImage(post)} alt="NOVA post" />
          ) : (
            <span>{post.caption}</span>
          )}
        </button>
      ))}
    </div>
  </section>

                     
) : page === "Reels" ? (
  <section className="flicks-page">
    <div className="flicks-header">
      <h2>FLICKS</h2>
      <button onClick={() => flicksFileRef.current?.click()}>
        <Plus size={20} /> Upload
      </button>
    </div>

    <input
      ref={flicksFileRef}
      type="file"
      accept="video/*"
      hidden
      onChange={uploadFlick}
    />

    <div className="flicks-feed" ref={flicksFeedRef}>
      {[
        {
          id: "featured-1",
          video_url: "/flicks/featured1.mp4",
          caption: "Welcome to NOVA. ✨",
          featured: true,
        },
        {
          id: "featured-2",
          video_url: "/flicks/featured2.mp4",
          caption: "Discover something new. 💜",
          featured: true,
        },
        {
          id: "featured-3",
          video_url: "/flicks/featured3.mp4",
          caption: "Your world. Your moments. Your NOVA.",
          featured: true,
        },
        ...flicks.map(flick => ({
          ...flick,
          featured: false,
        })),
      ].map(flick => (
        <article className="flick-card" key={flick.id}>
          <video
            src={flick.video_url}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />

          <div className="flick-overlay">
  {flick.featured && <span>FEATURED ON NOVA</span>}

  <p>{flick.caption}</p>
</div>

<div className="flick-actions">
  <button
    className={flickLiked[flick.id] ? "liked" : ""}
    onClick={() => toggleFlickLike(flick)}
    aria-label="Like FLICK"
  >
    <Heart
      size={28}
      fill={flickLiked[flick.id] ? "currentColor" : "none"}
    />
    <span>{flickLikeCounts[flick.id] || 0}</span>
  </button>

  <button
  onClick={() => openFlickComments(flick)}
  aria-label="Comments"
>
  <MessageCircle size={28} />
  <span>
    {flick.id === activeFlick?.id ? flickComments.length : "Comment"}
  </span>
</button>

  <button
    onClick={() => alert("FLICK saving coming next!")}
    aria-label="Save FLICK"
  >
    <Bookmark size={27} />
    <span>Save</span>
  </button>

  <button
    onClick={() => {
      if (navigator.share) {
        navigator.share({
          title: "NOVA FLICK",
          text: flick.caption,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
      }
    }}
    aria-label="Share FLICK"
  >
    <Send size={27} />
    <span>Share</span>
  </button>
</div>
        </article>
      ))}
    </div>
    {activeFlick && (
  <div className="flick-comments-backdrop" onClick={() => setActiveFlick(null)}>
    <div
      className="flick-comments-panel"
      onClick={event => event.stopPropagation()}
    >
      <div className="flick-comments-header">
        <h3>Comments</h3>
        <button onClick={() => setActiveFlick(null)}>✕</button>
      </div>

      <div className="flick-comments-list">
        {flickCommentsLoading ? (
          <p>Loading comments...</p>
        ) : flickComments.length === 0 ? (
          <p className="empty-flick-comments">
            No comments yet. Start the conversation 💜
          </p>
        ) : (
          flickComments.map(comment => (
            <div className="flick-comment" key={comment.id}>
              <strong>
                {comment.profile?.display_name ||
                  comment.profile?.username ||
                  "NOVA user"}
              </strong>
              <p>{comment.content}</p>
            </div>
          ))
        )}
      </div>

      <form className="flick-comment-form" onSubmit={addFlickComment}>       <input
          value={flickCommentText}
          onChange={event => setFlickCommentText(event.target.value)}
          placeholder="Add a comment..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  </div>
)}
  </section>
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
      
<div className="profile-avatar avatar-upload">
  {profile.avatar ? (
    <img src={profile.avatar} alt="Profile picture" />
  ) : (
    profile.name ? profile.name[0].toUpperCase() : "N"
  )}

  <button
    className="nova-avatar-badge"
    onClick={() => setAvatarMenuOpen(prev => !prev)}
    aria-label="Open profile actions"
  >
    <Zap size={16} fill="white" />
  </button>

  {avatarMenuOpen && (
    <div className="nova-avatar-menu">
      <button onClick={() => {
        setAvatarMenuOpen(false);
        avatarFileRef.current?.click();
      }}>
        <UserRound size={17} /> Change picture
      </button>

      <button onClick={() => {
        setAvatarMenuOpen(false);
        setStoryMedia(null);
        setActiveStory({
          name: "Your story",
          color: "#7953c8",
          own: true,
        });
      }}>
        <Plus size={17} /> Add to Story
      </button>

      <button onClick={() => {
        setAvatarMenuOpen(false);
        postFileRef.current?.click();
      }}>
        <Camera size={17} /> Create a post
      </button>
    </div>
  )}

  <input
    ref={avatarFileRef}
    type="file"
    accept="image/*"
    hidden
    onChange={uploadAvatar}
  />


<input
  ref={postFileRef}
  type="file"
  accept="image/*"
  hidden
  onChange={uploadFeedPost}
/>
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
  onClick={async () => {
    const name = window.prompt("Your display name:", profile.name);
    if (name === null) return;

    const username = window.prompt(
      "Your username:",
      profile.username
    );
    if (username === null) return;

    const bio = window.prompt("Your bio:", profile.bio);
    if (bio === null) return;

    const updatedProfile = {
      ...profile,
      name: name.trim(),
      username: username.replace("@", "").trim(),
      bio: bio.trim(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        username: updatedProfile.username,
        display_name: updatedProfile.name,
        bio: updatedProfile.bio,
        avatar_url: profile.avatar || null,
      });

    if (error) {
      console.error("Profile saving error:", error);
      alert(`Couldn't save your profile: ${error.message}`);
      return;
    }

    setProfile(updatedProfile);
    alert("Your NOVA profile has been saved! 💜");
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
       {navigation.map(({ name, label, icon: Icon }) => (
          <button key={name} onClick={() => setPage(name)}>
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={() => setPage("Camera")}><Camera size={23} /></button>
      </div>

      {activePost && (
        <div className="comments-overlay">
          <div className="comments-window">
            <div className="comments-header">
              <h2>Comments</h2>
              <button onClick={() => setActivePost(null)}>×</button>
            </div>

           
<div className="comments-list">
  {commentsLoading ? (
    <p>Loading comments...</p>
  ) : comments.length === 0 ? (
    <p>No comments yet. Be the first! 💜</p>
  ) : (
    comments.map((comment) => (
      <div className="comment-item" key={comment.id}>
        <div className="comment-avatar">
          {comment.profile?.avatar_url ? (
            <img src={comment.profile.avatar_url} alt="" />
          ) : (
            (comment.profile?.display_name || comment.profile?.username || "N")[0].toUpperCase()
          )}
        </div>

        <div className="comment-content">
          <strong>
            {comment.profile?.display_name || comment.profile?.username || "NOVA user"}
          </strong>
          <p>{comment.content}</p>
        </div>
      </div>
    ))
  )}
</div>

<form
  className="comment-form"
  onSubmit={(e) => {
    e.preventDefault();
    addComment();
  }}
>
  <input
    type="text"
    placeholder="Add a comment..."
    value={commentText}
    onChange={(e) => setCommentText(e.target.value)}
  />
  <button type="submit" disabled={!commentText.trim()}>
    Post
  </button>
</form>

            

            <form
              className="comment-form"
              onSubmit={(e) => {
                e.preventDefault();
                addComment();
              }}
            >
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit" disabled={!commentText.trim()}>
                Post
              </button>
            </form>
          </div>
        </div>
      )}

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
