import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAudioPlayer } from 'expo-audio';
import { useAuthStore, useFarmerStore } from '../store';

export default function GramvikashSplashScreen({ navigation }) {
  const player = useAudioPlayer(require('../audio/splashaudio.mp3'));
  const tokens = useAuthStore((state) => state.tokens);
  const farmer = useFarmerStore((state) => state.farmer);
  const holdTimerRef = useRef(null);

  useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (player) {
      player.play();
    }
  }, [player]);

  useEffect(() => {
    if (!navigation) return;

    holdTimerRef.current = setTimeout(() => {
      if (tokens?.access) {
        const profileComplete = !!farmer?.name && !!farmer?.digilocker_linked;
        navigation.replace(profileComplete ? 'MainTabs' : 'IdentityVerification');
      } else {
        navigation.replace('Login');
      }
    }, 9500);

    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, [navigation, tokens?.access, farmer?.name, farmer?.digilocker_linked]);

  // We use your exact HTML/CSS, but adjusted for a full-screen mobile view
  // rather than an artificial phone shell.
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Noto+Sans+Devanagari:wght@400;500;600&family=DM+Sans:wght@400;500;700&family=Lora:ital@1&display=swap" rel="stylesheet"/>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      
      body, html {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #f9f4e8;
        
        /* Add these lines to kill web-like behavior */
        overscroll-behavior: none; /* Stops the bounce/rubber-band effect */
        touch-action: none; /* Disables all browser touch gestures like pan/zoom */
        -webkit-user-select: none; /* Prevents text/element selection */
        user-select: none;
        -webkit-touch-callout: none; /* Disables the long-press popup menu */
      }

      /* ── Splash container (Full Screen Now) ── */
      .splash {
        width: 100vw;
        height: 100vh;
        position: relative;
        overflow: hidden;
        background: linear-gradient(175deg, #fef9ed 0%, #fdf3d0 30%, #f5e6a3 65%, #e8d47a 100%);
      }

      /* ── Sky gradient layer ────────────────────── */
      .sky {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, #fffbf0 0%, #fff8e0 25%, #fdf0b0 55%, #f5e080 80%, #e8c84a 100%);
      }

      /* ── Sun ───────────────────────────────────── */
      .sun {
        position: absolute;
        top: 12vh;
        left: 50%;
        transform: translateX(-50%);
        width: 90px;
        height: 90px;
        border-radius: 50%;
        background: radial-gradient(circle at 40% 40%, #fff9c4 0%, #ffe066 40%, #ffb800 75%, #ff8c00 100%);
        box-shadow: 0 0 0 16px rgba(255,200,0,0.12), 0 0 0 32px rgba(255,200,0,0.07), 0 0 0 56px rgba(255,200,0,0.04), 0 0 80px rgba(255,180,0,0.3);
        animation: sunRise 1.8s cubic-bezier(0.22,1,0.36,1) forwards, sunGlow 4s ease-in-out 2s infinite;
        opacity: 0;
      }
      @keyframes sunRise {
        0%   { opacity: 0; transform: translateX(-50%) translateY(30px); }
        100% { opacity: 1; transform: translateX(-50%) translateY(0px); }
      }
      @keyframes sunGlow {
        0%,100% { box-shadow: 0 0 0 16px rgba(255,200,0,0.12), 0 0 0 32px rgba(255,200,0,0.07), 0 0 0 56px rgba(255,200,0,0.04), 0 0 80px rgba(255,180,0,0.3); }
        50%     { box-shadow: 0 0 0 22px rgba(255,200,0,0.15), 0 0 0 44px rgba(255,200,0,0.09), 0 0 0 70px rgba(255,200,0,0.05), 0 0 100px rgba(255,180,0,0.4); }
      }

      /* ── Sun rays ──────────────────────────────── */
      .rays {
        position: absolute;
        top: 12vh;
        left: 50%;
        transform: translateX(-50%);
        width: 90px;
        height: 90px;
        animation: raysAppear 2.2s ease forwards, raysSpin 20s linear 2.5s infinite;
        opacity: 0;
      }
      @keyframes raysAppear { 0%{opacity:0} 100%{opacity:1} }
      @keyframes raysSpin { from{transform:translateX(-50%) rotate(0deg)} to{transform:translateX(-50%) rotate(360deg)} }

      .ray {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 60px;
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, rgba(255,210,50,0.6) 50%, transparent 100%);
        transform-origin: 0 50%;
        border-radius: 2px;
      }
      .ray:nth-child(1)  { transform: rotate(0deg) translateY(-50%); }
      .ray:nth-child(2)  { transform: rotate(30deg) translateY(-50%); }
      .ray:nth-child(3)  { transform: rotate(60deg) translateY(-50%); }
      .ray:nth-child(4)  { transform: rotate(90deg) translateY(-50%); }
      .ray:nth-child(5)  { transform: rotate(120deg) translateY(-50%); }
      .ray:nth-child(6)  { transform: rotate(150deg) translateY(-50%); }
      .ray:nth-child(7)  { transform: rotate(180deg) translateY(-50%); }
      .ray:nth-child(8)  { transform: rotate(210deg) translateY(-50%); }
      .ray:nth-child(9)  { transform: rotate(240deg) translateY(-50%); }
      .ray:nth-child(10) { transform: rotate(270deg) translateY(-50%); }
      .ray:nth-child(11) { transform: rotate(300deg) translateY(-50%); }
      .ray:nth-child(12) { transform: rotate(330deg) translateY(-50%); }

      /* ── Rolling hills / earth ─────────────────── */
      .hills { position: absolute; bottom: 0; left: 0; right: 0; height: 50vh; }
      .hill-back {
        position: absolute; bottom: 35vh; left: -20px; right: -20px; height: 18vh;
        background: #c8a84b; border-radius: 80% 80% 0 0 / 60% 60% 0 0; opacity: 0.35;
        animation: hillsRise 1.4s 0.8s cubic-bezier(0.22,1,0.36,1) both;
      }
      .hill-mid {
        position: absolute; bottom: 27vh; left: -30px; right: -30px; height: 20vh;
        background: linear-gradient(180deg, #7ab648 0%, #5a9c28 100%);
        border-radius: 60% 70% 0 0 / 50% 50% 0 0;
        animation: hillsRise 1.4s 0.9s cubic-bezier(0.22,1,0.36,1) both;
      }
      .hill-front {
        position: absolute; bottom: 20vh; left: -10px; right: -10px; height: 16vh;
        background: linear-gradient(180deg, #5a9c28 0%, #3d7a18 100%);
        border-radius: 50% 60% 0 0 / 40% 40% 0 0;
        animation: hillsRise 1.4s 1.0s cubic-bezier(0.22,1,0.36,1) both;
      }

      /* ── Ground/soil band ──────────────────────── */
      .ground {
        position: absolute; bottom: 0; left: 0; right: 0; height: 25vh;
        background: linear-gradient(180deg, #4a7c20 0%, #3d6b18 18%, #8b5e2a 30%, #7a4f1e 55%, #6b4318 80%, #5c3912 100%);
        animation: groundRise 1.2s 1.1s cubic-bezier(0.22,1,0.36,1) both; transform: translateY(200px);
      }

      @keyframes hillsRise { 0% { transform: translateY(100px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      @keyframes groundRise { 0% { transform: translateY(200px); } 100% { transform: translateY(0); } }

      /* ── Field furrows / tilled rows ────────────── */
      .furrows {
        position: absolute; bottom: 0; left: 0; right: 0; height: 20vh; overflow: hidden;
        animation: groundRise 1.2s 1.1s cubic-bezier(0.22,1,0.36,1) both; transform: translateY(200px);
      }
      .furrow {
        position: absolute; left: 0; right: 0; height: 3px; background: rgba(0,0,0,0.15); border-radius: 50%;
        transform: perspective(300px) rotateX(70deg); transform-origin: bottom center;
      }
      .furrow:nth-child(1) { bottom: 17vh; width: 70%; left: 15%; opacity: 0.4; }
      .furrow:nth-child(2) { bottom: 14vh; width: 80%; left: 10%; opacity: 0.5; }
      .furrow:nth-child(3) { bottom: 11vh;  width: 88%; left: 6%;  opacity: 0.5; }
      .furrow:nth-child(4) { bottom: 8vh;  width: 93%; left: 3%;  opacity: 0.6; }
      .furrow:nth-child(5) { bottom: 5vh;  width: 97%; left: 1%;  opacity: 0.6; }
      .furrow:nth-child(6) { bottom: 3vh;  width: 100%; left: 0;  opacity: 0.5; }
      .furrow:nth-child(7) { bottom: 1vh;  width: 100%; left: 0;  opacity: 0.4; }

      /* ── Wheat stalks ──────────────────────────── */
      .wheat-field {
        position: absolute; bottom: 19vh; left: 0; right: 0; height: 25vh;
        display: flex; align-items: flex-end; justify-content: center; padding: 0 8px; overflow: hidden;
      }
      .stalk-wrap {
        display: flex; flex-direction: column; align-items: center;
        animation: stalkGrow var(--dur, 1.2s) var(--delay, 0s) cubic-bezier(0.22,1,0.36,1) both;
        transform-origin: bottom center;
      }
      @keyframes stalkGrow { 0% { transform: scaleY(0); opacity: 0; } 60% { opacity: 1; } 100% { transform: scaleY(1); opacity: 1; } }
      .stalk-wrap:nth-child(odd)  { animation-name: stalkGrow, sway; animation-duration: var(--dur,1.2s), var(--sway,3s); animation-delay: var(--delay,0s), calc(var(--delay,0s) + 1.4s); animation-timing-function: cubic-bezier(0.22,1,0.36,1), ease-in-out; animation-fill-mode: both, none; animation-iteration-count: 1, infinite; }
      .stalk-wrap:nth-child(even) { animation-name: stalkGrow, swayR; animation-duration: var(--dur,1.2s), var(--sway,3.4s); animation-delay: var(--delay,0s), calc(var(--delay,0s) + 1.4s); animation-timing-function: cubic-bezier(0.22,1,0.36,1), ease-in-out; animation-fill-mode: both, none; animation-iteration-count: 1, infinite; }
      @keyframes sway  { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
      @keyframes swayR { 0%,100%{transform:rotate(3deg)}  50%{transform:rotate(-3deg)} }

      .stalk {
        width: var(--w, 3px); height: var(--h, 12vh);
        background: linear-gradient(180deg, #c9a227 0%, #d4a820 20%, #b8960e 60%, #8a6f10 100%);
        border-radius: 2px 2px 0 0; position: relative;
      }
      .stalk::before, .stalk::after {
        content: ''; position: absolute; width: 14px; height: 5px;
        background: linear-gradient(90deg, #7ab648, #5a9c28); border-radius: 0 50% 50% 0;
      }
      .stalk::before { top: 35%; left: 0; transform: rotate(-30deg) translateX(-8px); }
      .stalk::after  { top: 55%; left: 0; transform: rotate(30deg) scaleX(-1) translateX(-8px); }

      .ear {
        width: var(--ew, 12px); height: var(--eh, 32px);
        background: linear-gradient(180deg, #e8c84a 0%, #d4a820 40%, #c09010 100%);
        border-radius: 50% 50% 30% 30%; position: relative; margin-bottom: -1px; box-shadow: inset -2px 0 4px rgba(0,0,0,0.1);
      }
      .ear::before {
        content: ''; position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 1px; height: 16px;
        background: linear-gradient(180deg, #c09010, transparent);
        box-shadow: -4px 2px 0 #c09010, 4px 2px 0 #c09010, -3px 6px 0 #c09010, 3px 6px 0 #c09010;
      }

      /* ── Paddy plants (back row) ───────────────── */
      .paddy-field {
        position: absolute; bottom: 18vh; left: 0; right: 0; height: 10vh;
        display: flex; align-items: flex-end; justify-content: space-between; padding: 0 4px; opacity: 0.55; filter: blur(0.5px);
      }
      .paddy {
        display: flex; flex-direction: column; align-items: center;
        animation: paddyGrow var(--dur,1s) var(--delay,0s) cubic-bezier(0.22,1,0.36,1) both, sway var(--sway,2.8s) calc(var(--delay,0s) + 1.2s) ease-in-out infinite;
        transform-origin: bottom center;
      }
      @keyframes paddyGrow { 0% { transform: scaleY(0); opacity: 0; } 100% { transform: scaleY(1); opacity: 1; } }
      .paddy-stalk { width: 2px; height: var(--ph, 55px); background: linear-gradient(180deg, #7ab648, #5a9c28 60%, #3d7010 100%); border-radius: 1px; }
      .paddy-head { width: 6px; height: 18px; background: linear-gradient(180deg, #c8a84b, #a87820 60%, #8a6010 100%); border-radius: 50% 50% 30% 30%; margin-bottom: -1px; transform: rotate(var(--tilt,0deg)); }

      /* ── Birds ─────────────────────────────────── */
      .birds { position: absolute; top: 20vh; left: 0; right: 0; height: 60px; }
      .bird { position: absolute; animation: birdFly var(--bd,18s) var(--bdelay,0s) linear infinite; opacity: 0; }
      @keyframes birdFly { 0% { left: -40px; top: var(--bh,0px); opacity:0; } 5% { opacity: 0.7; } 95% { opacity: 0.7; } 100% { left: 110vw; top: calc(var(--bh,0px) - 20px); opacity:0; } }
      .bird-svg { width: 22px; height: 10px; animation: birdWing 0.5s ease-in-out infinite alternate; }
      @keyframes birdWing { 0% { transform: scaleY(1); } 100% { transform: scaleY(-0.6); } }

      /* ── Floating dust particles ───────────────── */
      .particles { position: absolute; inset: 0; pointer-events: none; }
      .particle { position: absolute; border-radius: 50%; background: rgba(255,210,50,0.4); animation: float var(--fd,8s) var(--fdelay,0s) ease-in-out infinite; }
      @keyframes float { 0%,100% { transform: translateY(0) translateX(0) scale(1); opacity: 0; } 20% { opacity: 0.8; } 80% { opacity: 0.3; } 50% { transform: translateY(-80px) translateX(var(--fx,20px)) scale(1.2); } }

      /* ── Logo/brand center ─────────────────────── */
      .brand {
        position: absolute; top: 45%; left: 50%; transform: translate(-50%, -58%); text-align: center; z-index: 10;
        animation: brandReveal 0.9s 1.6s cubic-bezier(0.22,1,0.36,1) both;
      }
      @keyframes brandReveal { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); } 100% { opacity: 1; transform: translate(-50%, -58%) scale(1); } }
      .logo-circle {
        width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg, #ffffff 0%, #f9f4e0 100%);
        box-shadow: 0 8px 32px rgba(138,100,20,0.25), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.9);
        display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; position: relative;
        animation: logoFloat 3.5s ease-in-out 2.8s infinite;
      }
      @keyframes logoFloat { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
      .logo-circle::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px dashed rgba(200,168,75,0.4); animation: logoRotate 12s linear infinite; }
      @keyframes logoRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      .logo-emoji { font-size: 44px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); }
      .brand-name { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 700; color: #2d5a0e; letter-spacing: -1px; line-height: 1; text-shadow: 0 2px 8px rgba(255,255,255,0.8); margin-bottom: 6px; }
      .brand-devanagari { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 15px; color: #5a8a28; letter-spacing: 0.05em; font-weight: 500; opacity: 0.85; margin-bottom: 10px; }
      .brand-tagline { font-family: 'Lora', serif; font-size: 12px; font-style: italic; color: #7a5c1a; letter-spacing: 0.08em; opacity: 0.8; }

      /* ── Loading bar ───────────────────────────── */
      .loader-wrap { position: absolute; bottom: 10vh; left: 50%; transform: translateX(-50%); width: 140px; z-index: 10; animation: loaderAppear 0.6s 2.2s ease both; opacity: 0; }
      @keyframes loaderAppear { 0%{opacity:0} 100%{opacity:1} }
      .loader-track { width: 100%; height: 3px; background: rgba(255,255,255,0.35); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
      .loader-bar { height: 100%; background: linear-gradient(90deg, #2d5a0e, #7ab648, #c8a84b); border-radius: 2px; animation: loadProgress 2.5s 2.2s cubic-bezier(0.4,0,0.2,1) both; width: 0%; }
      @keyframes loadProgress { 0%{width:0%} 100%{width:100%} }
      .loader-text { text-align: center; font-family: 'Noto Sans Devanagari', sans-serif; font-size: 11px; color: rgba(250, 250, 250, 0.6); letter-spacing: 0.05em; animation: dotsAnim 1.2s 2.4s step-start infinite; }
      @keyframes dotsAnim { 0%,100% { content: ''; } 0% { --d: ' .'; } 33% { --d: ' ..'; } 66% { --d: ' ...'; } }

      /* ── Cloud puffs ───────────────────────────── */
      .clouds { position: absolute; top: 0; left: 0; right: 0; height: 30vh; pointer-events: none; }
      .cloud { position: absolute; opacity: 0; animation: cloudDrift var(--cd,25s) var(--cdelay,0s) ease-in-out infinite; }
      @keyframes cloudDrift { 0% { left: -100px; opacity: 0; } 5% { opacity: var(--co, 0.4); } 95% { opacity: var(--co, 0.4); } 100% { left: 110vw; opacity: 0; } }
      .cloud-body { background: rgba(255,255,255,0.7); border-radius: 50px; width: var(--cw, 80px); height: var(--ch, 30px); position: relative; filter: blur(1px); }
      .cloud-body::before { content: ''; position: absolute; background: rgba(255,255,255,0.7); border-radius: 50%; width: 50%; height: 180%; top: -40%; left: 20%; }
      .cloud-body::after { content: ''; position: absolute; background: rgba(255,255,255,0.6); border-radius: 50%; width: 38%; height: 150%; top: -30%; left: 45%; }

      /* ── Butterfly ─────────────────────────────── */
      .butterfly { position: absolute; bottom: 30vh; left: -30px; animation: butterflyPath 12s 3s ease-in-out infinite; z-index: 8; }
      @keyframes butterflyPath { 0% { left: -30px; bottom: 30vh; opacity:0; } 5% { opacity:1; } 25% { left: 30vw; bottom: 35vh; } 50% { left: 50vw; bottom: 32vh; } 75% { left: 80vw; bottom: 36vh; } 95% { opacity:1; } 100% { left: 110vw; bottom: 31vh; opacity:0; } }
      .butterfly-wing { width: 20px; height: 14px; background: radial-gradient(circle at 50% 50%, #ff9e1b, #ff6b35); border-radius: 50%; animation: wingFlap 0.35s ease-in-out infinite alternate; display: inline-block; }
      .butterfly-wing.right { background: radial-gradient(circle at 50% 50%, #ffb84d, #ff8c35); transform: scaleX(-1); animation-delay: 0.175s; }
      @keyframes wingFlap { 0% { transform: scaleY(1); } 100% { transform: scaleY(0.2) scaleX(0.9); } }

      /* ── Shimmer overlay ───────────────────────── */
      .shimmer { position: absolute; inset: 0; background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%); background-size: 200% 200%; animation: shimmerMove 5s ease-in-out 2s infinite; pointer-events: none; }
      @keyframes shimmerMove { 0% { background-position: 200% 200%; } 50% { background-position: 0% 0%; } 100% { background-position: 200% 200%; } }
    </style>
    </head>
    <body>
      <div class="splash">
        <div class="sky"></div>

        <div class="clouds">
          <div class="cloud" style="--cd:28s;--cdelay:0.5s;--co:0.35;top:8vh;">
            <div class="cloud-body" style="--cw:90px;--ch:28px;"></div>
          </div>
          <div class="cloud" style="--cd:22s;--cdelay:5s;--co:0.25;top:12vh;">
            <div class="cloud-body" style="--cw:60px;--ch:20px;"></div>
          </div>
          <div class="cloud" style="--cd:32s;--cdelay:11s;--co:0.3;top:10vh;">
            <div class="cloud-body" style="--cw:75px;--ch:24px;"></div>
          </div>
        </div>

        <div class="rays">
          <div class="ray"></div><div class="ray"></div><div class="ray"></div>
          <div class="ray"></div><div class="ray"></div><div class="ray"></div>
          <div class="ray"></div><div class="ray"></div><div class="ray"></div>
          <div class="ray"></div><div class="ray"></div><div class="ray"></div>
        </div>

        <div class="sun"></div>

        <div class="birds">
          <div class="bird" style="--bd:20s;--bdelay:2.5s;--bh:10px;">
            <svg class="bird-svg" viewBox="0 0 22 10"><path d="M0 8 Q5.5 2 11 5 Q16.5 2 22 8" fill="none" stroke="#3d7010" stroke-width="1.5"/></svg>
          </div>
          <div class="bird" style="--bd:16s;--bdelay:6s;--bh:28px;">
            <svg class="bird-svg" viewBox="0 0 16 8"><path d="M0 6 Q4 1 8 4 Q12 1 16 6" fill="none" stroke="#3d7010" stroke-width="1.2"/></svg>
          </div>
          <div class="bird" style="--bd:24s;--bdelay:10s;--bh:15px;">
            <svg class="bird-svg" viewBox="0 0 18 8"><path d="M0 7 Q4.5 2 9 4 Q13.5 2 18 7" fill="none" stroke="#5a7020" stroke-width="1.2"/></svg>
          </div>
        </div>

        <div class="hills">
          <div class="hill-back"></div>
          <div class="hill-mid"></div>
          <div class="hill-front"></div>
        </div>

        <div class="ground"></div>

        <div class="furrows">
          <div class="furrow"></div><div class="furrow"></div><div class="furrow"></div>
          <div class="furrow"></div><div class="furrow"></div><div class="furrow"></div>
          <div class="furrow"></div>
        </div>

        <div class="paddy-field">
          <script>
            document.currentScript.insertAdjacentHTML('afterend', Array.from({length: parseInt(window.innerWidth / 10)}, (_,i)=>{
              const h = 40+Math.random()*25;
              const tilt = (Math.random()-0.5)*20;
              const delay = 0.9 + Math.random()*0.4;
              return \`<div class="paddy" style="--ph:\${h}px;--tilt:\${tilt}deg;--delay:\${delay}s;--dur:0.9s;--sway:\${2.4+Math.random()*1.2}s;">
                <div class="paddy-head" style="--tilt:\${tilt}deg;"></div>
                <div class="paddy-stalk"></div>
              </div>\`;
            }).join(''));
          </script>
        </div>

        <div class="wheat-field">
          <script>
            document.currentScript.insertAdjacentHTML('afterend', Array.from({length: parseInt(window.innerWidth / 15)}, (_,i)=>{
              const h = 100+Math.random()*60;
              const ew = 10+Math.random()*5;
              const eh = 28+Math.random()*12;
              const w = 2.5+Math.random()*1.5;
              const delay = 1.1 + i*0.06 + Math.random()*0.1;
              const sway = 2.5+Math.random()*1.5;
              return \`<div class="stalk-wrap" style="--h:\${h}px;--ew:\${ew}px;--eh:\${eh}px;--delay:\${delay}s;--dur:1.1s;--sway:\${sway}s;">
                <div class="ear" style="width:\${ew}px;height:\${eh}px;"></div>
                <div class="stalk" style="--h:\${h}px;--w:\${w}px;height:\${h}px;width:\${w}px;"></div>
              </div>\`;
            }).join(''));
          </script>
        </div>

        <div class="butterfly">
          <div class="butterfly-wing"></div>
          <div class="butterfly-wing right"></div>
        </div>

        <div class="particles">
          <script>
            document.currentScript.insertAdjacentHTML('afterend', Array.from({length:20}, (_,i)=>{
              const x = 5+Math.random()*90;
              const size = 3+Math.random()*5;
              const fd = 5+Math.random()*7;
              const fdelay = Math.random()*5;
              const fx = (Math.random()-0.5)*40;
              return \`<div class="particle" style="left:\${x}%;bottom:\${140+Math.random()*100}px;width:\${size}px;height:\${size}px;--fd:\${fd}s;--fdelay:\${fdelay}s;--fx:\${fx}px;"></div>\`;
            }).join(''));
          </script>
        </div>

        <div class="brand">
          <div class="logo-circle">
            <span class="logo-emoji">🌾</span>
          </div>
          <div class="brand-name">Gramvikash</div>
          <div class="brand-devanagari">ग्रामविकाश</div>
          <div class="brand-tagline">Har Kisan Ka Saathi</div>
        </div>

        <div class="loader-wrap">
          <div class="loader-track">
            <div class="loader-bar"></div>
          </div>
          <div class="loader-text">लोड हो रहा है...</div>
        </div>

       
      </div>
      <script>
        // Prevents any default scrolling or dragging on the document
        document.addEventListener('touchmove', function(event) {
            event.preventDefault();
        }, { passive: false });
        </script>
    </body>
    
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* Translucent native status bar looks best over the animated sky */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}

        /* The native lock-down props */
        scrollEnabled={false}
        bounces={false} /* iOS: Stops rubber-banding */
        overScrollMode="never" /* Android: Stops edge-glow and scrolling */
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});