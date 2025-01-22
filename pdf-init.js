import * as pdfjsLib from './pdf.mjs';
window.pdfjsLib = pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.mjs');
