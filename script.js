const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const log = document.getElementById('log');
const colors = {};

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false
  });
  video.srcObject = stream;
  return new Promise(resolve => {
    video.onloadedmetadata = () => resolve(video);
  });
}

function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
}

function speak(text) {
  if (!window.speaking) {
    window.speaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.onend = () => window.speaking = false;
    speechSynthesis.speak(utterance);
  }
}

function detectFrame(video, model) {
  model.detect(video).then(predictions => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    predictions.forEach(pred => {
      const [x, y, width, height] = pred.bbox;
      if (!colors[pred.class]) colors[pred.class] = randomColor();

      ctx.strokeStyle = colors[pred.class];
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = colors[pred.class];
      ctx.fillText(`${pred.class} (${(pred.score * 100).toFixed(1)}%)`, x, y > 10 ? y - 5 : 10);

      speak(pred.class);

      const tag = document.createElement('div');
      tag.innerText = pred.class;
      tag.style.position = 'absolute';
      tag.style.left = `${x}px`;
      tag.style.top = `${y}px`;
      tag.style.color = colors[pred.class];
      tag.style.fontSize = '20px';
      tag.style.opacity = '1';
      hud.appendChild(tag);

      gsap.to(tag, {
        opacity: 0,
        y: -30,
        duration: 2,
        onComplete: () => tag.remove()
      });

      const time = new Date().toLocaleTimeString();
      log.innerHTML += `<div>[${time}] ${pred.class}</div>`;
      log.scrollTop = log.scrollHeight;
    });

    requestAnimationFrame(() => detectFrame(video, model));
  });
}

// コンパス表示
window.addEventListener('deviceorientationabsolute', function (event) {
  const compass = document.getElementById('compass');
  if (event.absolute && typeof event.alpha === 'number') {
    const heading = 360 - event.alpha;
    compass.setAttribute('value', `Heading: ${heading.toFixed(1)}°`);
  }
}, true);

async function run() {
  await setupCamera();
  const model = await cocoSsd.load();
  detectFrame(video, model);
}

run();
