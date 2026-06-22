// scanner.js — camera start/stop, barcode decode (BarcodeDetector / ZXing), image upload fallback
(function () {
    const video = document.getElementById('video');
    const input = document.getElementById('barcodeInput');
    const form = document.getElementById('scanForm');
    const submitBtn = document.getElementById('submitBtn');
    const startBtn = document.getElementById('startCamera');
    const stopBtn = document.getElementById('stopCamera');
    const statusEl = document.getElementById('status');

    let codeReader = null;
    let detectorLoop = false;
    let mediaStream = null;

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
        console.log('[scanner] ' + text);
    }

    if (!video || !input || !form || !startBtn || !stopBtn) {
        console.error('[scanner] missing DOM elements', { video, input, form, startBtn, stopBtn });
        if (statusEl) statusEl.textContent = 'Lỗi giao diện: thiếu phần tử.';
        return;
    }

    function handleScanned(code) {
        input.value = code;
        input.classList.add('flash');
        setTimeout(() => input.classList.remove('flash'), 200);
        // Automatically lookup product when scanned
        lookupProduct(code);
    }

    // Demo product catalog (replace with your API call if needed)
    const catalog = {
        '8901123456789': { name: 'Sữa tươi 1L', price: '45.000₫', image: '' },
        '8938500012345': { name: 'Bánh quy vị sô-cô-la', price: '25.000₫', image: '' },
        '012345678905': { name: 'Nước suối 500ml', price: '8.000₫', image: '' }
    };

    const productNameEl = document.getElementById('productName');
    const productPriceEl = document.getElementById('productPrice');
    const productImageEl = document.getElementById('productImage');

    function lookupProduct(barcode) {
        setStatus('Tìm kiếm sản phẩm: ' + barcode);
        // first try local catalog
        const p = catalog[barcode];
        if (p) {
            displayProduct(p);
            return;
        }
        // Example: you can replace this with a real API call
        // For demo, show not found
        productNameEl.textContent = 'Không tìm thấy sản phẩm';
        productPriceEl.textContent = '';
        productImageEl.style.display = 'none';
        setStatus('Không tìm thấy sản phẩm cho mã: ' + barcode);
    }

    function displayProduct(p) {
        productNameEl.textContent = p.name || '';
        productPriceEl.textContent = p.price || '';
        if (p.image) { productImageEl.src = p.image; productImageEl.style.display = 'block'; }
        else { productImageEl.style.display = 'none'; }
        setStatus('Sản phẩm hiển thị');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = input.value.trim();
        if (!value) return;
        console.log('Processing barcode:', value);
        alert('Barcode processed: ' + value);
        input.select();
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
    });

    async function startCamera() {
        setStatus('Yêu cầu quyền camera...');
        stopCamera();

        try {
            // ZXing path (if available)
            if (window.ZXing && ZXing.BrowserMultiFormatReader) {
                codeReader = new ZXing.BrowserMultiFormatReader();
                let devices = null;
                try { devices = await codeReader.listVideoInputDevices(); } catch (e) { console.warn('listVideoInputDevices failed', e); }

                if (devices && devices.length) {
                    const selected = devices[0].deviceId;
                    codeReader.decodeFromVideoDevice(selected, 'video', (result, err) => {
                        if (result) handleScanned(result.getText());
                        if (err && !(err instanceof ZXing.NotFoundException)) console.warn(err);
                    });
                    startBtn.disabled = true; stopBtn.disabled = false; setStatus('Camera đang hoạt động');
                    return;
                }

                // fallback to getUserMedia + decodeFromVideoElement
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    video.srcObject = mediaStream; await video.play();
                    if (codeReader.decodeFromVideoElement) {
                        codeReader.decodeFromVideoElement(video, (result, err) => {
                            if (result) handleScanned(result.getText());
                            if (err && !(err instanceof ZXing.NotFoundException)) console.warn(err);
                        });
                        startBtn.disabled = true; stopBtn.disabled = false; setStatus('Camera đang hoạt động (fallback)');
                        return;
                    }
                }
            }

            // BarcodeDetector fallback
            if ('BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                video.srcObject = mediaStream; await video.play();
                const detector = new BarcodeDetector();
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                detectorLoop = true;
                (async function loop() {
                    if (!detectorLoop) return;
                    if (video.readyState === video.HAVE_ENOUGH_DATA) {
                        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0);
                        try {
                            const results = await detector.detect(canvas);
                            if (results && results.length) handleScanned(results[0].rawValue);
                        } catch (e) { console.warn('BarcodeDetector error', e); }
                    }
                    requestAnimationFrame(loop);
                })();
                startBtn.disabled = true; stopBtn.disabled = false; setStatus('Camera đang hoạt động (BarcodeDetector)');
                return;
            }

            setStatus('Trình duyệt không hỗ trợ quét mã.');
        } catch (err) {
            console.error('[scanner] startCamera error', err);
            setStatus('Không thể mở camera: ' + (err && err.message ? err.message : err));
        }
    }

    function stopCamera() {
        detectorLoop = false;
        if (codeReader) { try { codeReader.reset(); } catch (e) { } codeReader = null; }
        if (video && video.srcObject) { try { video.srcObject.getTracks().forEach(t => t.stop()); } catch (e) { } video.srcObject = null; }
        if (mediaStream) { try { mediaStream.getTracks().forEach(t => t.stop()); } catch (e) { } mediaStream = null; }
        startBtn.disabled = false; stopBtn.disabled = true; setStatus('Camera đã tắt');
    }

    startBtn.addEventListener('click', (e) => { e.preventDefault(); console.log('[scanner] start button clicked'); setStatus('Bấm Bật camera...'); startCamera(); });
    stopBtn.addEventListener('click', (e) => { e.preventDefault(); console.log('[scanner] stop button clicked'); setStatus('Tắt camera...'); stopCamera(); });

    setStatus('Sẵn sàng — bấm "Bật camera"');
    console.log('[scanner] initialized');

    // File upload fallback
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            setStatus('Đang đọc ảnh...');
            const img = new Image();
            const url = URL.createObjectURL(f);
            img.onload = async () => {
                try {
                    // try BarcodeDetector first
                    if ('BarcodeDetector' in window) {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
                        const detector = new BarcodeDetector();
                        try {
                            const results = await detector.detect(canvas);
                            if (results && results.length) {
                                handleScanned(results[0].rawValue);
                                setStatus('Mã quét từ ảnh: ' + results[0].rawValue);
                                URL.revokeObjectURL(url); return;
                            }
                        } catch (dErr) { console.warn('BarcodeDetector failed', dErr); }
                    }

                    // fallback to ZXing from image
                    if (window.ZXing && ZXing.BrowserBarcodeReader) {
                        const reader = new ZXing.BrowserBarcodeReader();
                        try {
                            const result = await reader.decodeFromImageElement(img);
                            if (result) { handleScanned(result.getText()); setStatus('Mã quét từ ảnh: ' + result.getText()); }
                        } catch (e) { console.warn('ZXing image decode failed', e); setStatus('Không tìm mã trong ảnh'); }
                    } else {
                        setStatus('Không có phương pháp decode ảnh trên trình duyệt này');
                    }
                } finally { URL.revokeObjectURL(url); }
            };
            img.onerror = () => { setStatus('Không thể đọc ảnh'); URL.revokeObjectURL(url); };
            img.src = url;
        });
    }

})();
