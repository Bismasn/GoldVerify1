const contractAddress = "0x86Bb4C5c4Af67752eDFe998Ef05C590143a6eF47";

const contractABI = [
  "function isPaused() public view returns (bool)",
  "function togglePause() external",
  "function daftarkanEmas(string memory _serialNumber, string memory _batch, string memory _berat, string memory _karat, string memory _namaPemilik) external",
  "function updatePemilik(string memory _serialNumber, string memory _pemilikBaru) external",
  "function batalkanEmas(string memory _serialNumber) external",
  "function cekKeaslian(string memory _serialNumber) external view returns (bool terdaftar, string memory pesanStatus, string memory batch, string memory berat, string memory karat, string memory namaPemilik, uint256 waktuDaftar)",
];

let provider, signer, contract;
let lastBlockHash =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
let totalBlocksRendered = 0;

// EVENT EVENT DETECTOR METAMASK SECURE SESSIONS
if (typeof window.ethereum !== "undefined") {
  window.ethereum.on("accountsChanged", function (accounts) {
    window.location.reload();
  });

  window.ethereum.on("chainChanged", function (chainId) {
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        contract = new ethers.Contract(contractAddress, contractABI, signer);

        setWalletConnectedUI(accounts[0]);
      }
    } catch (err) {
      console.error("Gagal silent auto-connect:", err);
    }
  });
}

async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    const btn = document.getElementById("btnConnect");

    if (btn.getAttribute("data-state") === "connected") {
      disconnectWallet();
      return;
    }

    try {
      btn.innerText = "Connecting...";

      // FORCE METAMASK UNTUK MEMILIH ULANG AKUN / REQUEST PERMISSION
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      // Setelah user memilih akun di pop-up baru, ambil datanya
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      contract = new ethers.Contract(contractAddress, contractABI, signer);

      setWalletConnectedUI(accounts[0]);
    } catch (error) {
      console.error(error);
      resetWalletUI();
      showToast(
        "Koneksi dompet dibatalkan.",
        "bg-red-500/10 text-red-400 border border-red-500/20",
      );
    }
  } else {
    alert("Silakan pasang ekstensi MetaMask!");
  }
}

function setWalletConnectedUI(account) {
  const btn = document.getElementById("btnConnect");
  btn.innerText = "Disconnect Wallet";
  btn.setAttribute("data-state", "connected");
  btn.className =
    "bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-5 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-red-600/20";

  document.getElementById("walletLabel").innerText =
    `Connected: ${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
}

function resetWalletUI() {
  const btn = document.getElementById("btnConnect");
  btn.innerText = "Connect Wallet";
  btn.removeAttribute("data-state");
  btn.className =
    "bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-5 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-indigo-600/20";

  document.getElementById("walletLabel").innerText = "Wallet Not Connected";
}

function disconnectWallet() {
  provider = null;
  signer = null;
  contract = null;
  resetWalletUI();
  showToast(
    "Wallet disconnected dari aplikasi.",
    "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  );
}

// OPERASI BLOCKCHAIN GRAPH LOG INTERACTION
function addBlockVisual(blockNumber, txHash, serialId, actionType, detailText) {
  const container = document.getElementById("blockchainContainer");
  const emptyView = document.getElementById("emptyBlockView");

  if (emptyView) emptyView.remove();

  let statusAccent = "border-indigo-500/30 shadow-indigo-950/20";
  if (actionType === "MINT")
    statusAccent = "border-emerald-500/40 shadow-emerald-950/20";
  if (actionType === "REVOKE")
    statusAccent = "border-red-500/40 shadow-red-950/20";

  const shortTx = txHash.substring(0, 14) + "...";
  const shortPrev = lastBlockHash.substring(0, 14) + "...";

  if (totalBlocksRendered > 0) {
    const arrow = document.createElement("div");
    arrow.className =
      "text-slate-600 font-bold text-center text-xs py-0.5 select-none animate-pulse";
    arrow.innerHTML = "↓";
    container.appendChild(arrow);
  }

  const blockCard = document.createElement("div");
  blockCard.className = `w-full bg-[#0e101b] border ${statusAccent} rounded-xl p-3 shadow-lg font-mono text-[11px] space-y-1.5 transition-all duration-200 hover:border-slate-700`;
  blockCard.innerHTML = `
                <div class="flex justify-between items-center border-b border-slate-800 pb-1 mb-1">
                    <span class="font-bold text-white text-[11px]">Blok #${blockNumber}</span>
                    <span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-800 text-indigo-400 font-bold">${actionType}</span>
                </div>
                <div class="text-indigo-300 font-medium truncate" title="Tx Hash: ${txHash}">${shortTx}</div>
                <div class="text-slate-500 text-[9px] truncate" title="Prev Hash: ${lastBlockHash}">prev: ${shortPrev}</div>
                <div class="pt-1 border-t border-slate-800/60 mt-1 flex justify-between items-center">
                    <span class="text-amber-400 font-bold text-[10px] tracking-wide uppercase">${serialId}</span>
                    <span class="text-slate-400 text-[10px] max-w-[120px] truncate text-right">${detailText}</span>
                </div>
            `;

  container.appendChild(blockCard);
  totalBlocksRendered++;

  document.getElementById("blockCounterView").innerText =
    `${totalBlocksRendered} Blok`;
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  lastBlockHash = txHash;
}

async function muatRiwayatBlok() {
  if (!contract) return;

  try {
    const container = document.getElementById("blockchainContainer");

    const emptyView = document.getElementById("emptyBlockView");
    if (emptyView) emptyView.remove();

    // 1. RESET SEMUA STATE VISUAL & MEMORI SEBELUM LOOPING SINKRONISASI
    container.innerHTML = "";
    totalBlocksRendered = 0;
    // Reset hash acuan ke nilai default agar blok pertama membaca ini sebagai 'prev'
    lastBlockHash =
      "0x0000000000000000000000000000000000000000000000000000000000000000";

    showToast(
      "Sinkronisasi riwayat ledger dari Sepolia...",
      "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    );

    // (Proses filter logs EmasDidaftarkan, PemilikDiperbarui, EmasDibatalkan...)
    // [... Kode penarikan logs tetap sama seperti sebelumnya ...]

    // 2. Jalankan looping setelah array semuaLog di-sort
    semuaLog.sort((a, b) => a.blockNumber - b.blockNumber);

    if (semuaLog.length === 0) {
      container.innerHTML = `
                <div id="emptyBlockView" class="text-center py-16 text-slate-600 text-xs font-mono space-y-2">
                    <p class="text-xl">📭</p>
                    <p class="text-[11px]">Belum ada data block di smart contract ini.</p>
                </div>`;
    } else {
      semuaLog.forEach((item) => {
        // Di sini addBlockVisual akan otomatis menyusun mata rantai hash (prev) dengan benar secara berurutan
        addBlockVisual(
          item.blockNumber,
          item.txHash,
          item.serialId,
          item.actionType,
          item.detailText,
        );
      });
      showToast(
        "Ledger Blockchain Sinkron!",
        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      );
    }
  } catch (error) {
    console.error(error);
  }
}

async function buatSertifikatEmas() {
  if (!contract) return alert("Hubungkan wallet terlebih dahulu!");

  const sn = document.getElementById("addSerial").value;
  const batch = document.getElementById("addBatch").value;
  const berat = document.getElementById("addBerat").value;
  const karat = document.getElementById("addKarat").value;
  const pemilik = document.getElementById("addPemilik").value;

  if (!sn || !batch || !berat || !karat || !pemilik) {
    return alert("Mohon lengkapi semua kolom!");
  }

  showToast(
    "Memproses persetujuan transaksi di MetaMask...",
    "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  );
  try {
    const tx = await contract.daftarkanEmas(sn, batch, berat, karat, pemilik);
    showToast(
      "Menulis blok transaksi ke blockchain Sepolia...",
      "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    );
    const receipt = await tx.wait();
    showToast(
      "Sukses! Emas berhasil didaftarkan secara permanen.",
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    );

    addBlockVisual(receipt.blockNumber, tx.hash, sn, "MINT", pemilik);

    document.getElementById("addSerial").value = "";
    document.getElementById("addBatch").value = "";
    document.getElementById("addBerat").value = "";
    document.getElementById("addKarat").value = "";
    document.getElementById("addPemilik").value = "";
  } catch (error) {
    console.error(error);
    showToast(
      "Transaksi Gagal. Pastikan Anda Admin dan ID belum terdaftar.",
      "bg-red-500/10 text-red-400 border border-red-500/20",
    );
  }
}

async function updatePemilikEmas() {
  if (!contract) return alert("Hubungkan wallet terlebih dahulu!");

  const sn = document.getElementById("transferSerial").value;
  const pemilikBaru = document.getElementById("transferPemilikBaru").value;

  if (!sn || !pemilikBaru)
    return alert("Lengkapi ID Serial dan Nama Pemilik Baru!");

  showToast(
    "Mengirim perintah update nama pemilik...",
    "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  );
  try {
    const tx = await contract.updatePemilik(sn, pemilikBaru);
    const receipt = await tx.wait();
    showToast(
      "Sukses! Kepemilikan emas berhasil dipindahtangankan.",
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    );

    addBlockVisual(receipt.blockNumber, tx.hash, sn, "TRANSFER", pemilikBaru);

    document.getElementById("transferSerial").value = "";
    document.getElementById("transferPemilikBaru").value = "";
  } catch (error) {
    console.error(error);
    showToast(
      "Gagal! Pastikan status emas aktif dan Anda adalah Admin.",
      "bg-red-500/10 text-red-400 border border-red-500/20",
    );
  }
}

async function cekKeaslianEmas() {
  if (!contract) return alert("Hubungkan wallet terlebih dahulu!");
  const sn = document.getElementById("querySerial").value;
  if (!sn) return alert("Masukkan Nomor Seri Emas!");

  showToast(
    "Mencari data di blockchain Sepolia...",
    "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  );

  try {
    const res = await contract.cekKeaslian(sn);

    const terdaftar = res[0];
    const pesanStatus = res[1];
    const batch = res[2];
    const berat = res[3];
    const karat = res[4];
    const namaPemilik = res[5];
    const waktuDaftar = res[6];

    document.getElementById("placeholderView").classList.add("hidden");
    document.getElementById("certificateSheet").classList.remove("hidden");

    document.getElementById("certSerial").innerText = sn;
    document.getElementById("certStatusMsg").innerText = pesanStatus;

    document.getElementById("certBatch").innerText = terdaftar ? batch : "N/A";
    document.getElementById("certBerat").innerText = terdaftar ? berat : "N/A";
    document.getElementById("certKarat").innerText = terdaftar ? karat : "N/A";
    document.getElementById("certPemilik").innerText = terdaftar
      ? namaPemilik
      : "UNKNOWN ENTITY";

    if (terdaftar && waktuDaftar > 0) {
      const date = new Date(Number(waktuDaftar) * 1000);
      document.getElementById("certDate").innerText =
        date.toLocaleString("id-ID") + " WITA";
    } else {
      document.getElementById("certDate").innerText = "N/A";
    }

    const stamp = document.getElementById("certStamp");
    const stampTxt = document.getElementById("stampText");

    if (!terdaftar) {
      stampTxt.innerText = "INVALID";
      stamp.className =
        "w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-bold text-[10px] uppercase tracking-tighter font-serif rotate-[-12deg] border-red-500 text-red-500 bg-red-50/50";
      showToast(
        "Pencarian selesai: Sertifikat TIDAK TERDAFTAR / PALSU!",
        "bg-red-500/10 text-red-400 border border-red-500/20",
      );
    } else if (
      pesanStatus.includes("PERINGATAN") ||
      pesanStatus.includes("DIBATALKAN")
    ) {
      stampTxt.innerText = "REVOKED";
      stamp.className =
        "w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-bold text-[10px] uppercase tracking-tighter font-serif rotate-[-12deg] border-amber-500 text-amber-500 bg-amber-50/50";
      showToast(
        "Peringatan: Sertifikat telah ditarik/dibekukan!",
        "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      );
    } else {
      stampTxt.innerText = "VERIFIED";
      stamp.className =
        "w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-bold text-[10px] uppercase tracking-tighter font-serif rotate-[-12deg] border-emerald-600 text-emerald-600 bg-emerald-50/50";
      showToast(
        "Pencarian selesai: Emas Valid & Terverifikasi!",
        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      );
    }
  } catch (error) {
    console.error(error);
    showToast(
      "Gagal membaca data dari blockchain.",
      "bg-red-500/10 text-red-400 border border-red-500/20",
    );
  }
}

async function ubahStatusValidasi() {
  if (!contract) return alert("Hubungkan wallet!");
  const sn = document.getElementById("statusSerial").value;
  if (!sn) return alert("Masukkan ID Serial!");

  showToast(
    "Mengirim perintah pembatalan (batalkanEmas)...",
    "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  );
  try {
    const tx = await contract.batalkanEmas(sn);
    const receipt = await tx.wait();
    showToast(
      "Sukses! Status emas berhasil dibatalkan (Revoked).",
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    );

    addBlockVisual(receipt.blockNumber, tx.hash, sn, "REVOKE", "Revoked Card");
    document.getElementById("statusSerial").value = "";
  } catch (error) {
    console.error(error);
    showToast(
      "Gagal! Pastikan Anda memegang akun Admin kontrak.",
      "bg-red-500/10 text-red-400 border border-red-500/20",
    );
  }
}

function showToast(msg, classes) {
  const el = document.getElementById("toastMessage");
  el.className = `mt-4 p-3 rounded-xl text-xs text-center border ${classes}`;
  el.innerText = msg;
  el.classList.remove("hidden");
}
