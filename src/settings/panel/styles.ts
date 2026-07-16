/**
 * Shared CSS injected into the settings side panel.
 */
import { domFontStyle } from "../../ui/fonts";

export const SETTINGS_PANEL_CSS = `
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  @keyframes slideOut {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }
  .setting-group { margin-bottom:24px; }
  .setting-label {
    font-size:15px;color:rgba(180,220,255,0.8);margin-bottom:10px;
    letter-spacing:1px;
  }
  .setting-options { display:flex;gap:6px;flex-wrap:wrap; }
  .setting-opt {
    padding:9px 13px;border-radius:6px;font-size:15px;cursor:pointer;
    background:rgba(100,200,255,0.1);border:1px solid rgba(100,200,255,0.2);
    color:rgba(255,255,255,0.7);transition:all 0.2s ease;
    ${domFontStyle("body")}
  }
  .setting-opt:hover { background:rgba(100,200,255,0.2); }
  .setting-opt.active {
    background:rgba(100,200,255,0.3);border-color:rgba(100,200,255,0.8);
    color:#fff;
  }
  .setting-opt.group-opt {
    flex:1;min-width:80px;text-align:center;
  }
  .setting-opt.group-opt.active {
    background:rgba(100,200,255,0.4);border-color:#4488ff;
  }
  .vol-row {
    display:flex;align-items:center;gap:10px;margin-bottom:10px;
  }
  .vol-name {
    width:72px;flex-shrink:0;font-size:14px;color:rgba(255,255,255,0.75);
  }
  .vol-slider {
    flex:1;-webkit-appearance:none;appearance:none;height:6px;border-radius:3px;
    background:rgba(100,200,255,0.2);outline:none;cursor:pointer;
  }
  .vol-slider::-webkit-slider-thumb {
    -webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;
    background:#8ec8ff;border:1px solid rgba(255,255,255,0.5);cursor:pointer;
  }
  .vol-slider::-moz-range-thumb {
    width:16px;height:16px;border-radius:50%;
    background:#8ec8ff;border:1px solid rgba(255,255,255,0.5);cursor:pointer;
  }
  .vol-value {
    width:40px;text-align:right;font-size:13px;color:rgba(170,204,255,0.9);
    font-variant-numeric:tabular-nums;
  }
`;
