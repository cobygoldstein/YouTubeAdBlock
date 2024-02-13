/*
TODO:
- Autofocus when iframe loads so you can use hot keys and arrows
- check if video has an ad before inserting embedded window. Saves time not blocking a video that doesn't have ads for intial set up
*/

const runInitialSetUp = (fromReload) => {
  let video = document.querySelector("video");
  const videoPlayer = document.getElementById("player");
  if (video) {
    // pause on initial video
    video.pause();
    // take advantage of SPA, and continually pause original video player
    video.addEventListener("playing", pauseVideo, false);
    createAndAddIframe(video, videoPlayer, fromReload);
  } else {
    console.log("ERROR: Could not find video");
  }
};

const pauseVideo = (event) => {
  event.currentTarget.pause();
};

// checks if video is embeddable, if yes, embed, if not abort!
const videoIdHandler = async (video, videoPlayer, fromReload) => {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get("v");
  if (videoId) {
    const isEmbeddable = await checkIfEmbeddable(videoId);
    if (isEmbeddable) {
      return constructIframe(video, videoPlayer, videoId, fromReload);
    } else {
      console.log("Video is not embeddable");
      abort(video, true);
    }
  } else {
    console.log("ERROR: no videoId");
  }
};

// when we programatically abort, tell the user
const showApologyMessage = (video) => {
  let sorryText = document.createElement("div");
  sorryText.style.fontFamily = "YouTube Sans, Roboto, Arial, sans-serif";
  sorryText.innerHTML = "Apologies - we are unable to embed this video";
  sorryText.style.position = "absolute";
  const videoRect = video.getBoundingClientRect();
  sorryText.style.top = videoRect.top + 10 + "px";
  sorryText.style.right = window.innerWidth - videoRect.right + "px";
  sorryText.style.color = "white";
  sorryText.style.fontSize = "18px";
  sorryText.style.zIndex = "999";
  sorryText.style.backgroundColor = "rgba(0, 0, 0, .25)";
  sorryText.style.padding = "10px";
  sorryText.style.borderRadius = "5px";
  sorryText.style.textAlign = "right";
  window.document.body.appendChild(sorryText);
  setTimeout(() => {
    sorryText.remove();
  }, 2500);
};

// remove all functions to expose native videoPlayer, and prep for restarting
const abort = (video, shouldSendMessage) => {
  removeIframe();
  firstTime = true;
  logoDisabled = true;
  video.removeEventListener("playing", pauseVideo);
  video.play();
  showApologyMessage(video);
  if (shouldSendMessage) {
    sendNotification(
      "Inactive",
      "Apologies, we are unable to embed this video"
    );
  }
};

// Construct the Iframe to be added, with added logic for when the page was manually reloaded
const constructIframe = (video, videoPlayer, videoId, fromReload) => {
  const iframe = document.createElement("iframe");
  iframe.id = "insertedVideo";
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  iframe.title = "YouTube video player";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.style.zIndex = "6";
  iframe.style.position = "absolute";
  iframe.style.border = "none";

  // gives us position relative to viewport
  const videoRect = video.getBoundingClientRect();
  const videoPlayerRect = videoPlayer.getBoundingClientRect();

  // calculates absolute position
  const videoAbsoluteTop = window.scrollY + videoRect.top;
  const videoAbsoluteLeft = window.scrollX + videoRect.left;
  const videoPlayerAbsoluteTop = window.scrollY + videoPlayerRect.top;
  const videoPlayerAbsoluteLeft = window.scrollX + videoPlayerRect.left;

  // If the page has been reloaded, it only works from video, else use player
  // somehow inverse for height
  if (fromReload) {
    iframe.style.top = videoAbsoluteTop - 1 + "px";
    iframe.style.left = videoAbsoluteLeft + "px";
    iframe.style.height = video.offsetHeight + 2 + "px";
  } else {
    iframe.style.top = videoPlayerAbsoluteTop - 1 + "px";
    iframe.style.left = videoPlayerAbsoluteLeft + "px";
    iframe.style.height = videoPlayer.offsetHeight + 2 + "px";
  }

  // Width always use video
  iframe.style.width = video.offsetWidth + "px";

  const updateIframeDimensions = () => {
    const newLeft = window.scrollX + video.getBoundingClientRect().left;

    // Sometimes height and width both equal 0 (usually occurs after reload),
    // in that case, we use the less accurate, but persistant video h/w
    if (videoPlayer.offsetHeight === 0 && videoPlayer.offsetWidth === 0) {
      iframe.style.height = video.offsetHeight + 2 + "px";
      iframe.style.width = video.offsetWidth + "px";
    } else {
      iframe.style.height = videoPlayer.offsetHeight + 2 + "px";
      iframe.style.width = videoPlayer.offsetWidth + "px";
    }
    iframe.style.left = newLeft + "px";
  };

  // Update the dimensions whenever the videoPlayer's dimensions change
  window.addEventListener("resize", updateIframeDimensions);
  // handles for when videoPlayer changes size, but window does not (ie: fanduel ad)
  new ResizeObserver(updateIframeDimensions).observe(videoPlayer);

  return iframe;
};

const createAndAddIframe = async (video, videoPlayer, fromReload) => {
  videoIdHandler(video, videoPlayer, fromReload).then((iframe) => {
    if (iframe) {
      window.document.body.appendChild(iframe);
      sendNotification("Active");
    } else {
      console.log("ERROR: No Iframe To inject or no parent node");
    }
  });
};

// Call server function that checks if video is embeddable
// server checks if user is from chrome extension
// Covers for most cases, but sometimes videos are not embeddable even thought API says they are
// Common pattern is an account uses licensed content from another account (3rd party uses licensed NFL content to make highlights)
// something in the way they have set up the video makes the embeddable flag true, but then doesn't let it be embedded
// user can manually deactivate to watch original content. TODO: programatically detect when this happens and abort
const checkIfEmbeddable = async (videoId) => {
  return fetch("https://youtubeextension.servebeer.com/", {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      videoId,
    }),
    method: "POST",
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      return data.isEmbeddable;
    })
    .catch((error) => console.error("Error:", error));
};

const replaceIframe = async (video, videoPlayer) => {
  const iframe = document.getElementById("insertedVideo");
  const newIframe = await videoIdHandler(video, videoPlayer);
  if (iframe && newIframe) {
    iframe.parentNode.replaceChild(newIframe, iframe);
    sendNotification("Active");
  }
};

const removeIframe = () => {
  const iframe = document.getElementById("insertedVideo");
  if (iframe) {
    iframe.parentNode.removeChild(iframe);
  }
};

const IMAGE_OVERLAY_DURATION = 3000;

const overlayImageOnVideo = () => {
  let video = document.querySelector("video");

  if (!video) {
    console.error("Video player element not found");
    return;
  }

  // Wait for the video to load before overlaying the image
  const image = document.createElement("img");
  image.src = chrome.runtime.getURL("/images/logo500.png");
  image.style.position = "absolute";
  image.style.zIndex = "7";
  image.id = "insertedImage";
  image.style.height = "500px";
  image.style.width = "500px";

  const videoRect = video.getBoundingClientRect();

  if (videoRect.width !== 0) {
    image.style.left = videoRect.width / 2 - 250 + "px";
    image.style.top = videoRect.height / 2 - 250 + "px";
    video.parentNode.appendChild(image);

    // remove logo after 2 seconds. Video usually loads on top before this expires
    setTimeout(() => {
      removeOverlayImage();
    }, IMAGE_OVERLAY_DURATION);
  }
};

const removeOverlayImage = () => {
  const insertedImage = document.getElementById("insertedImage");
  if (insertedImage) {
    insertedImage.parentNode.removeChild(insertedImage);
  }
};

const sendNotification = (type, message) => {
  switch (type) {
    case "Active":
      chrome.runtime.sendMessage({ type: "Action", data: "Active" });
      break;
    case "Inactive":
      chrome.runtime.sendMessage({
        type: "Action",
        data: message || "Inactive",
      });
      break;
    case "Idle":
      chrome.runtime.sendMessage({ type: "Action", data: "Idle" });
      break;
    default:
      console.log("ERROR: Invalid notification type");
  }
};

// handles whether we need to run start up
let firstTime = true;
// handles whether we should show logo or not
let logoDisabled = false;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "urlChange") {
    if (window.location.href.includes("youtube.com/watch")) {
      // if firstTime, run initial set up
      if (firstTime) {
        let video = document.querySelector("video");
        // wait for video to load
        video.addEventListener(
          "canplaythrough",
          () => {
            overlayImageOnVideo();
            runInitialSetUp();
            firstTime = false;
          },
          { once: true }
        );
      } else {
        // else run normal
        let video = document.querySelector("video");
        const videoPlayer = document.getElementById("player");
        replaceIframe(video, videoPlayer);
      }
    } else {
      // not on a watch page
      if (!logoDisabled) {
        overlayImageOnVideo(); // show logo on close
      }
      logoDisabled = false;
      removeIframe();
      firstTime = true;
      sendNotification("Idle");
    }
    // manual request for abort from popup
  } else if (request.action === "abort") {
    let video = document.querySelector("video");
    abort(video, false);
  }
});

// Edge case - when user reloads or uses the back button, we manually need to start process
if (window.location.href.includes("youtube.com/watch")) {
  let video = document.querySelector("video");
  if (!video) {
    console.error("Video player element not found");
  } else {
    video.addEventListener(
      "canplaythrough",
      () => {
        overlayImageOnVideo(); // show logo on video player open
        runInitialSetUp(true);
        firstTime = false;
      },
      { once: true }
    );
  }
}
