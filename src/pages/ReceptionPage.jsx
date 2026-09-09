import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
    Radio,
    Volume2,
    VolumeX,
    Clock,
    Wifi,
    WifiOff,
    MapPin,
    Users,
    Settings,
    Play,
    Square,
    ChevronDown,
} from "lucide-react";

const SOCKET_URL = "http://localhost:3000";

function ReceptionPage() {
    const [connected, setConnected] = useState(false);
    const [currentAnnouncement, setCurrentAnnouncement] =
        useState(null);

    const [history, setHistory] = useState([]);

    const [isSpeaking, setIsSpeaking] = useState(false);

    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState("");
    const [rate, setRate] = useState(0.9);
    const [pitch, setPitch] = useState(1);

    const [showSettings, setShowSettings] = useState(false);

    const [speechSupported, setSpeechSupported] = useState(true);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const voiceEnabledRef = useRef(false);

    // File d'attente des annonces
    const speechQueueRef = useRef([]);

    // Indique si une annonce est actuellement en lecture
    const isProcessingQueueRef = useRef(false);

    // Permet de mémoriser la socket
    const socketRef = useRef(null);

    // ------------------------------------------------------------------
    // CHARGEMENT DES VOIX
    // ------------------------------------------------------------------

    useEffect(() => {
        if (!("speechSynthesis" in window)) {
            console.error(
                "La synthèse vocale n'est pas disponible dans ce navigateur."
            );

            setSpeechSupported(false);

            return;
        }

        const loadVoices = () => {
            const availableVoices =
                window.speechSynthesis.getVoices();

            console.log(
                "Voix disponibles :",
                availableVoices
            );

            setVoices(availableVoices);

            // Voix sauvegardée
            const savedVoice =
                localStorage.getItem(
                    "reception_voice"
                );

            if (
                savedVoice &&
                availableVoices.some(
                    (voice) => voice.name === savedVoice
                )
            ) {
                setSelectedVoice(savedVoice);
                return;
            }

            // Recherche automatique d'une voix française
            const frenchVoice =
                availableVoices.find(
                    (voice) =>
                        voice.lang === "fr-FR"
                ) ||
                availableVoices.find(
                    (voice) =>
                        voice.lang.startsWith("fr")
                );

            if (frenchVoice) {
                setSelectedVoice(frenchVoice.name);
            }
        };

        loadVoices();

        window.speechSynthesis.onvoiceschanged =
            loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged =
                null;
        };
    }, []);

    // ------------------------------------------------------------------
    // CHARGEMENT DES PARAMÈTRES
    // ------------------------------------------------------------------

    useEffect(() => {
        const savedRate =
            localStorage.getItem(
                "reception_voice_rate"
            );

        const savedPitch =
            localStorage.getItem(
                "reception_voice_pitch"
            );

        if (savedRate) {
            setRate(Number(savedRate));
        }

        if (savedPitch) {
            setPitch(Number(savedPitch));
        }
    }, []);

    // ------------------------------------------------------------------
    // SOCKET.IO
    // ------------------------------------------------------------------

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log(
                "🟢 Réception connectée au serveur"
            );

            setConnected(true);
        });

        socket.on("disconnect", (reason) => {
            console.log(
                "🔴 Réception déconnectée :",
                reason
            );

            setConnected(false);
        });

        socket.on("connect_error", (error) => {
            console.error(
                "Erreur de connexion Socket.IO :",
                error
            );

            setConnected(false);
        });

        socket.on(
            "new-announcement",
            (announcement) => {
                console.log(
                    "📢 Nouvelle annonce reçue :",
                    announcement
                );

                setCurrentAnnouncement(announcement);

                setHistory((current) => [
                    announcement,
                    ...current,
                ]);

                if (!voiceEnabledRef.current) {
                    console.warn(
                        "🔇 Système vocal non activé."
                    );

                    return;
                }

                speechQueueRef.current.push(
                    announcement
                );

                processSpeechQueue();
            }
        );

        return () => {
            socket.disconnect();

            window.speechSynthesis?.cancel();

            speechQueueRef.current = [];

            isProcessingQueueRef.current = false;
        };
    }, []);

    // ------------------------------------------------------------------
    // OBTENIR LA VOIX SÉLECTIONNÉE
    // ------------------------------------------------------------------

    const getSelectedVoice = () => {
        const availableVoices =
            window.speechSynthesis.getVoices();

        if (selectedVoice) {
            const exactVoice =
                availableVoices.find(
                    (voice) =>
                        voice.name === selectedVoice
                );

            if (exactVoice) {
                return exactVoice;
            }
        }

        return (
            availableVoices.find(
                (voice) =>
                    voice.lang === "fr-FR"
            ) ||
            availableVoices.find(
                (voice) =>
                    voice.lang.startsWith("fr")
            ) ||
            null
        );
    };

    // ------------------------------------------------------------------
    // CONSTRUIRE LE TEXTE
    // ------------------------------------------------------------------

    const buildAnnouncementText = (
        announcement
    ) => {
        const employeeCount =
            announcement.employeeIds.length;

        let employeeText;

        // if (employeeCount === 1) {
        //     employeeText =
        //         `L'employé ${announcement.employeeIds[0].replace('AMAA', '').replace('EMP', '')}`;
        // } else {
        //     employeeText =
        //         `Les employés ${announcement.employeeIds.join(
        //             ", "
        //         ).replaceAll('AMAA', '').replaceAll('EMP', '')}`;
        // }
        if (employeeCount === 1) {
            employeeText =
                `Numero ${announcement.employeeIds[0].replace('AMAA', '').replace('EMP', '')}`;
        } else {
            employeeText =
                `Numero ${announcement.employeeIds.join(
                    ", "
                ).replaceAll('AMAA', '').replaceAll('EMP', '')}`;
        }

        return `${employeeText} antsouine ${announcement.location}.`;
        // return `${employeeText} est appelé au ${announcement.location}.`;
    };

    // ------------------------------------------------------------------
    // TRAITER LA FILE D'ANNONCES
    // ------------------------------------------------------------------

    const processSpeechQueue = () => {
        if (isProcessingQueueRef.current) {
            return;
        }

        if (speechQueueRef.current.length === 0) {
            return;
        }

        if (
            !("speechSynthesis" in window)
        ) {
            return;
        }

        const announcement =
            speechQueueRef.current.shift();

        isProcessingQueueRef.current = true;

        speakAnnouncement(announcement);
    };

    // ------------------------------------------------------------------
    // LECTURE D'UNE ANNONCE
    // ------------------------------------------------------------------

    const speakAnnouncement = (
        announcement,
        retryCount = 0
    ) => {
        if (
            !("speechSynthesis" in window)
        ) {
            isProcessingQueueRef.current =
                false;

            setSpeechSupported(false);

            return;
        }

        const text =
            buildAnnouncementText(
                announcement
            );

        console.log(
            "🔊 Préparation de la lecture :",
            text
        );

        // Réinitialiser le moteur vocal
        try {
            window.speechSynthesis.resume();
            window.speechSynthesis.cancel();
        } catch (error) {
            console.error(
                "Erreur lors de la réinitialisation de la synthèse :",
                error
            );
        }

        // Petit délai important pour Chrome
        setTimeout(() => {
            const utterance =
                new SpeechSynthesisUtterance(
                    text
                );

            const voice =
                getSelectedVoice();

            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;

                console.log(
                    "🎙️ Voix utilisée :",
                    voice.name,
                    voice.lang
                );
            } else {
                utterance.lang = "fr-FR";

                console.warn(
                    "Aucune voix française trouvée."
                );
            }

            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = 1;

            utterance.onstart = () => {
                console.log(
                    "▶️ Lecture commencée"
                );

                setIsSpeaking(true);
            };

            utterance.onend = () => {
                console.log(
                    "✅ Lecture terminée"
                );

                setIsSpeaking(false);

                isProcessingQueueRef.current =
                    false;

                // Vérifier s'il reste des annonces
                setTimeout(() => {
                    processSpeechQueue();
                }, 100);
            };

            utterance.onerror = (event) => {
                console.error(
                    "❌ Erreur synthèse vocale :",
                    event
                );

                setIsSpeaking(false);

                // Certaines erreurs peuvent être temporaires
                if (
                    retryCount < 2 &&
                    event.error !== "canceled"
                ) {
                    console.log(
                        `🔄 Nouvelle tentative ${retryCount + 1
                        }/2`
                    );

                    isProcessingQueueRef.current =
                        false;

                    setTimeout(() => {
                        speakAnnouncement(
                            announcement,
                            retryCount + 1
                        );
                    }, 500);

                    return;
                }

                isProcessingQueueRef.current =
                    false;

                setTimeout(() => {
                    processSpeechQueue();
                }, 100);
            };

            try {
                window.speechSynthesis.resume();

                window.speechSynthesis.speak(
                    utterance
                );

                console.log(
                    "📢 speechSynthesis.speak() appelé"
                );
            } catch (error) {
                console.error(
                    "❌ Impossible de lancer la synthèse :",
                    error
                );

                setIsSpeaking(false);

                isProcessingQueueRef.current =
                    false;

                setTimeout(() => {
                    processSpeechQueue();
                }, 500);
            }
        }, 150);
    };

    // ------------------------------------------------------------------
    // ARRÊTER LA LECTURE
    // ------------------------------------------------------------------

    const stopSpeaking = () => {
        if (
            !("speechSynthesis" in window)
        ) {
            return;
        }

        console.log(
            "⏹️ Arrêt de la lecture"
        );

        window.speechSynthesis.cancel();

        speechQueueRef.current = [];

        isProcessingQueueRef.current =
            false;

        setIsSpeaking(false);
    };

    const enableVoice = () => {
        if (!("speechSynthesis" in window)) {
            alert(
                "La synthèse vocale n'est pas disponible dans ce navigateur."
            );
            return;
        }

        const utterance = new SpeechSynthesisUtterance(
            "Système vocal activé."
        );

        const voice = getSelectedVoice();

        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        } else {
            utterance.lang = "fr-FR";
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = 1;

        utterance.onstart = () => {
            console.log("🔊 Système vocal activé");

            voiceEnabledRef.current = true;
            setVoiceEnabled(true);

            setIsSpeaking(true);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
        };

        utterance.onerror = (event) => {
            console.error(
                "❌ Activation vocale impossible :",
                event
            );

            voiceEnabledRef.current = false;
            setVoiceEnabled(false);
            setIsSpeaking(false);
        };

        window.speechSynthesis.cancel();

        window.speechSynthesis.speak(
            utterance
        );
    };

    // ------------------------------------------------------------------
    // TESTER LA VOIX
    // ------------------------------------------------------------------

    const testVoice = () => {
        if (
            !("speechSynthesis" in window)
        ) {
            return;
        }

        window.speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(
                "Bonjour. Ceci est un test du système d'annonce vocale."
            );

        const voice =
            getSelectedVoice();

        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        } else {
            utterance.lang = "fr-FR";
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = 1;

        utterance.onstart = () => {
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
        };

        window.speechSynthesis.resume();

        setTimeout(() => {
            window.speechSynthesis.speak(
                utterance
            );
        }, 100);
    };

    // ------------------------------------------------------------------
    // PARAMÈTRES
    // ------------------------------------------------------------------

    const handleVoiceChange = (event) => {
        const voiceName =
            event.target.value;

        setSelectedVoice(voiceName);

        localStorage.setItem(
            "reception_voice",
            voiceName
        );
    };

    const handleRateChange = (event) => {
        const value =
            Number(event.target.value);

        setRate(value);

        localStorage.setItem(
            "reception_voice_rate",
            value.toString()
        );
    };

    const handlePitchChange = (event) => {
        const value =
            Number(event.target.value);

        setPitch(value);

        localStorage.setItem(
            "reception_voice_pitch",
            value.toString()
        );
    };

    // ------------------------------------------------------------------
    // JSX
    // ------------------------------------------------------------------

    return (
        <div className="reception-page">

            {/* ============================================================
          HEADER
      ============================================================ */}

            <header className="reception-header">

                <div className="reception-brand">

                    <div className="reception-logo">
                        <Radio size={28} />
                    </div>

                    <div>
                        <h1>
                            Voice Announcement
                        </h1>

                        <p>
                            Poste de réception
                        </p>
                    </div>

                </div>

                <div className="reception-header-actions">

                    {/* Connexion */}

                    <div
                        className={`reception-connection ${connected
                            ? "connection-online"
                            : "connection-offline"
                            }`}
                    >

                        {connected ? (
                            <Wifi size={18} />
                        ) : (
                            <WifiOff size={18} />
                        )}

                        <div>
                            <strong>
                                {connected
                                    ? "Système connecté"
                                    : "Système déconnecté"}
                            </strong>

                            <span>
                                {connected
                                    ? "En attente d'annonces"
                                    : "Connexion au serveur perdue"}
                            </span>
                        </div>

                        <span className="connection-dot"></span>

                    </div>

                    {/* Bouton paramètres */}

                    <button
                        className="reception-settings-button"
                        onClick={() =>
                            setShowSettings(
                                (current) => !current
                            )
                        }
                        title="Paramètres de la voix"
                    >
                        <Settings size={20} />
                    </button>

                </div>

            </header>

            {/* ============================================================
          PANNEAU PARAMÈTRES
      ============================================================ */}

            {showSettings && (

                <section className="voice-settings">

                    <div className="voice-settings-header">

                        <div>
                            <h2>
                                Paramètres vocaux
                            </h2>

                            <p>
                                Configurez la voix utilisée
                                pour les annonces.
                            </p>
                        </div>

                        <button
                            onClick={() =>
                                setShowSettings(false)
                            }
                        >
                            Fermer
                        </button>

                    </div>

                    {/* Voix */}

                    <div className="voice-setting">

                        <label htmlFor="voice">
                            Voix
                        </label>

                        <div className="voice-select">

                            <select
                                id="voice"
                                value={selectedVoice}
                                onChange={
                                    handleVoiceChange
                                }
                            >

                                <option value="">
                                    Voix automatique
                                </option>

                                {voices.map(
                                    (voice) => (
                                        <option
                                            key={`${voice.name}-${voice.lang}`}
                                            value={voice.name}
                                        >
                                            {voice.name} (
                                            {voice.lang})
                                        </option>
                                    )
                                )}

                            </select>

                            <ChevronDown
                                size={18}
                            />

                        </div>

                    </div>

                    {/* Vitesse */}

                    <div className="voice-setting">

                        <div className="setting-label">

                            <label htmlFor="rate">
                                Vitesse
                            </label>

                            <span>
                                {rate.toFixed(1)}
                            </span>

                        </div>

                        <input
                            id="rate"
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={rate}
                            onChange={
                                handleRateChange
                            }
                        />

                    </div>

                    {/* Tonalité */}

                    <div className="voice-setting">

                        <div className="setting-label">

                            <label htmlFor="pitch">
                                Tonalité
                            </label>

                            <span>
                                {pitch.toFixed(1)}
                            </span>

                        </div>

                        <input
                            id="pitch"
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={pitch}
                            onChange={
                                handlePitchChange
                            }
                        />

                    </div>

                    {/* Bouton test */}

                    <button
                        className="test-voice-button"
                        onClick={testVoice}
                    >
                        <Play size={18} />

                        Tester la voix
                    </button>

                </section>

            )}

            {/* ============================================================
          CONTENU
      ============================================================ */}

            <main className="reception-content">
                {!voiceEnabled && (
                    <section className="voice-disabled-panel">

                        <div className="voice-disabled-icon">
                            <VolumeX size={32} />
                        </div>

                        <div className="voice-disabled-content">
                            <h2>
                                Système vocal désactivé
                            </h2>

                            <p>
                                Cliquez sur le bouton pour activer
                                les annonces vocales automatiques.
                            </p>
                        </div>

                        <button
                            className="enable-voice-button"
                            onClick={enableVoice}
                        >
                            <Volume2 size={20} />
                            Activer le système vocal
                        </button>

                    </section>
                )}
                {/* ==========================================================
            ANNONCE ACTUELLE
        ========================================================== */}

                <section
                    className={`main-announcement ${isSpeaking
                        ? "announcement-speaking"
                        : ""
                        }`}
                >

                    <div className="announcement-top">

                        <div className="announcement-label">

                            <div className="announcement-speaker">

                                {isSpeaking ? (
                                    <Volume2 size={26} />
                                ) : (
                                    <VolumeX size={26} />
                                )}

                            </div>

                            <div>

                                <span>
                                    ANNONCE ACTUELLE
                                </span>

                                {isSpeaking && (
                                    <small>
                                        Lecture en cours...
                                    </small>
                                )}

                            </div>

                        </div>

                        <div className="announcement-actions">

                            {currentAnnouncement && (
                                <div className="announcement-clock">

                                    <Clock size={16} />

                                    {new Date(
                                        currentAnnouncement.createdAt
                                    ).toLocaleTimeString(
                                        "fr-FR"
                                    )}

                                </div>
                            )}

                            {isSpeaking && (
                                <button
                                    className="stop-speaking-button"
                                    onClick={stopSpeaking}
                                    title="Arrêter la lecture"
                                >
                                    <Square size={15} />

                                    Arrêter
                                </button>
                            )}

                        </div>

                    </div>

                    {/* ========================================================
              ANNONCE
          ======================================================== */}

                    {currentAnnouncement ? (

                        <div className="announcement-body">

                            {/* Employés */}

                            <div className="employee-call">

                                <div className="call-icon">
                                    <Users size={32} />
                                </div>

                                <div className="call-content">

                                    <span className="call-label">
                                        PERSONNE(S) APPELÉE(S)
                                    </span>

                                    <div className="employee-ids">

                                        {currentAnnouncement.employeeIds.map(
                                            (id) => (
                                                <span
                                                    className="employee-id"
                                                    key={id}
                                                >
                                                    {id}
                                                </span>
                                            )
                                        )}

                                    </div>

                                </div>

                            </div>

                            {/* Flèche */}

                            <div className="call-arrow">
                                ↓
                            </div>

                            {/* Destination */}

                            <div className="destination">

                                <div className="destination-icon">
                                    <MapPin size={32} />
                                </div>

                                <div>

                                    <span className="destination-label">
                                        DESTINATION
                                    </span>

                                    <strong>
                                        {
                                            currentAnnouncement.location
                                        }
                                    </strong>

                                </div>

                            </div>

                        </div>

                    ) : (

                        /* ======================================================
                           ÉTAT D'ATTENTE
                        ====================================================== */

                        <div className="reception-waiting">

                            <div className="waiting-icon">
                                <Volume2 size={48} />
                            </div>

                            <h2>
                                En attente d'une annonce
                            </h2>

                            <p>
                                Les annonces envoyées depuis
                                le poste de communication
                                apparaîtront automatiquement
                                ici.
                            </p>

                        </div>

                    )}

                </section>

                {/* ==========================================================
            HISTORIQUE
        ========================================================== */}

                <section className="reception-history">

                    <div className="history-title">

                        <div>

                            <h2>
                                Historique des annonces
                            </h2>

                            <span>
                                {history.length} annonce
                                {history.length !== 1
                                    ? "s"
                                    : ""}
                            </span>

                        </div>

                        <Clock size={20} />

                    </div>

                    {history.length === 0 ? (

                        <div className="history-empty">
                            Aucune annonce reçue pour le
                            moment.
                        </div>

                    ) : (

                        <div className="history-list">

                            {history.map(
                                (announcement, index) => (

                                    <div
                                        className="history-item"
                                        key={`${announcement.id}-${index}`}
                                    >

                                        <div className="history-number">
                                            {history.length - index}
                                        </div>

                                        <div className="history-main">

                                            <div className="history-employees">

                                                {announcement.employeeIds.map(
                                                    (id) => (
                                                        <span key={id}>
                                                            {id}
                                                        </span>
                                                    )
                                                )}

                                            </div>

                                            <div className="history-destination">

                                                <MapPin size={14} />

                                                {
                                                    announcement.location
                                                }

                                            </div>

                                        </div>

                                        <div className="history-time">

                                            <Clock size={14} />

                                            {new Date(
                                                announcement.createdAt
                                            ).toLocaleTimeString(
                                                "fr-FR"
                                            )}

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </section>

            </main>

            {/* ============================================================
          FOOTER
      ============================================================ */}

            <footer className="reception-footer">

                <div>

                    <span className="footer-dot"></span>

                    Service d'annonces vocales

                </div>

                <span>
                    Voice Announcement
                </span>

            </footer>

        </div>
    );
}

export default ReceptionPage;