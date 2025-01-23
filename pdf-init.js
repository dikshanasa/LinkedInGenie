import * as pdfjsLib from './pdf.mjs';
window.pdfjsLib = pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';
