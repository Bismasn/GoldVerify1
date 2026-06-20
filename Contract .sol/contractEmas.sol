// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VerifikasiEmasPro {
    // Alamat konstan untuk memisahkan tingkatan hak akses secara permanen
    address public constant ADMIN_1_SUPER = 0x6Ed1Dc0a1EE23E8af87A387462906143FEF930Bb;
    address public constant ADMIN_2_UPDATE = 0x6c5bF6A669f3c2a0dE17E428eCCB4D1BEC9F6bb1;
    address public constant ADMIN_3_TOKO = 0x08d1A912A8A30B6038D1f48cE7b70527F1c4CB25; // Tambah Admin Toko

    bool public isPaused; // Status darurat

    struct DetailEmas {
        bool isRegistered;
        uint256 timestamp;    // Waktu pendaftaran (Unix Epoch)
        string batchProduksi; // Kode produksi pabrik
        string berat;         // Contoh: "5 Gram" atau "10g"
        string karat;         // Contoh: "24K" atau "99.99%"
        string namaPemilik;   // Nama pemilik saat ini
        bool isRevoked;       // Status jika kartu ditarik/dicuri
    }

    // Mapping nomor seri ke struktur detail emas
    mapping(string => DetailEmas) private dataEmas;

    // Events untuk log permanen di blockchain
    event EmasDidaftarkan(
        string serialNumber, 
        string batchProduksi, 
        string berat, 
        string karat, 
        string namaPemilik, 
        uint256 timestamp
    );
    event PemilikDiperbarui(string serialNumber, string pemilikLama, string pemilikBaru, uint256 timestamp);
    event EmasDibatalkan(string serialNumber, uint256 timestamp);
    event ContractPaused(bool status);

    // ==========================================
    // MODIFIERS (SISTEM HAK AKSES BARU)
    // ==========================================

    // Tingkat 1: Hak akses penuh mutlak untuk Admin 1 saja (Super Admin)
    modifier hanyaSuperAdmin() {
        require(msg.sender == ADMIN_1_SUPER, "Akses ditolak: Fungsi ini memerlukan hak akses Super Admin (Admin 1)!");
        _;
    }

    // Tingkat 2: Hak akses bersama yang mengizinkan Admin 1, Admin 2, DAN Admin 3
    modifier hanyaAdminAkses() {
        require(
            msg.sender == ADMIN_1_SUPER || 
            msg.sender == ADMIN_2_UPDATE || 
            msg.sender == ADMIN_3_TOKO, 
            "Akses ditolak: Anda tidak memiliki otoritas untuk memodifikasi data ini!"
        );
        _;
    }

    modifier saatSistemAktif() {
        require(!isPaused, "Sistem sedang dihentikan sementara (Paused)!");
        _;
    }

    // ==========================================
    // FUNGSI KHUSUS SUPER ADMIN (ADMIN 1)
    // ==========================================

    function togglePause() external hanyaSuperAdmin {
        isPaused = !isPaused;
        emit ContractPaused(isPaused);
    }

    function daftarkanEmas(
        string memory _serialNumber, 
        string memory _batch,
        string memory _berat,
        string memory _karat,
        string memory _namaPemilik
    ) external hanyaSuperAdmin saatSistemAktif {
        require(!dataEmas[_serialNumber].isRegistered, "Nomor seri sudah terdaftar!");
        
        dataEmas[_serialNumber] = DetailEmas({
            isRegistered: true,
            timestamp: block.timestamp,
            batchProduksi: _batch,
            berat: _berat,
            karat: _karat,
            namaPemilik: _namaPemilik,
            isRevoked: false
        });

        emit EmasDidaftarkan(_serialNumber, _batch, _berat, _karat, _namaPemilik, block.timestamp);
    }

    function batalkanEmas(string memory _serialNumber) external hanyaSuperAdmin saatSistemAktif {
        require(dataEmas[_serialNumber].isRegistered, "Nomor seri tidak ditemukan!");
        require(!dataEmas[_serialNumber].isRevoked, "Emas sudah dibatalkan sebelumnya!");

        dataEmas[_serialNumber].isRevoked = true;

        emit EmasDibatalkan(_serialNumber, block.timestamp);
    }

    // ==========================================
    // FUNGSI BERSAMA (ADMIN 1, ADMIN 2 & ADMIN 3)
    // ==========================================

    // Sekarang fungsi ini bisa dipicu lancar oleh address Admin 3 yang baru tanpa kendala
    function updatePemilik(
        string memory _serialNumber, 
        string memory _pemilikBaru
    ) external hanyaAdminAkses saatSistemAktif {
        require(dataEmas[_serialNumber].isRegistered, "Nomor seri tidak ditemukan!");
        require(!dataEmas[_serialNumber].isRevoked, "Emas sudah dibatalkan, tidak bisa ganti pemilik!");

        string memory pemilikLama = dataEmas[_serialNumber].namaPemilik;
        dataEmas[_serialNumber].namaPemilik = _pemilikBaru;

        emit PemilikDiperbarui(_serialNumber, pemilikLama, _pemilikBaru, block.timestamp);
    }

    // ==========================================
    // FUNGSI PUBLIK (READ-ONLY FOR EVERYONE)
    // ==========================================

    function cekKeaslian(string memory _serialNumber) external view returns (
        bool terdaftar, 
        string memory pesanStatus, 
        string memory batch,
        string memory berat,
        string memory karat,
        string memory namaPemilik,
        uint256 waktuDaftar
    ) {
        DetailEmas memory emas = dataEmas[_serialNumber];

        if (!emas.isRegistered) {
            return (false, "PALSU / TIDAK TERDAFTAR", "", "", "", "", 0);
        }
        
        if (emas.isRevoked) {
            return (
                true, 
                "PERINGATAN: KARTU DIBATALKAN / DILAPORKAN HILANG", 
                emas.batchProduksi, 
                emas.berat, 
                emas.karat, 
                emas.namaPemilik, 
                emas.timestamp
            );
        }

        return (
            true, 
            "VALID & ASLI", 
            emas.batchProduksi, 
            emas.berat, 
            emas.karat, 
            emas.namaPemilik, 
            emas.timestamp
        );
    }
}