
// Versiyon Kontrol Dosyası
var MatrixC_Version = 'v6';

// Tarayıcı ortamı için
if (typeof window !== 'undefined') {
    window.MatrixC_Version = MatrixC_Version;
}

// Service Worker ortamı için
if (typeof self !== 'undefined') {
    self.MatrixC_Version = MatrixC_Version;
}
