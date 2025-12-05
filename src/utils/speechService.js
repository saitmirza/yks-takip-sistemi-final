// Web Speech API - Sesten Metine Dönüşüm

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
};

export const useSpeechRecognition = (onResult, onError) => {
  const recognition = getSpeechRecognition();
  
  if (!recognition) {
    return {
      isSupported: false,
      isListening: false,
      startListening: () => alert("Tarayıcınız ses tanıma özelliğini desteklemiyor."),
      stopListening: () => {}
    };
  }

  recognition.lang = 'tr-TR'; // Türkçe
  recognition.continuous = false;
  recognition.interimResults = true;

  let isListening = false;

  recognition.onstart = () => {
    isListening = true;
    console.log("🎤 Mikrofon başladı...");
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript.trim());
    }
  };

  recognition.onerror = (event) => {
    console.error("🎤 Ses tanıma hatası:", event.error);
    
    let errorMessage = "Ses tanıma hatası oluştu.";
    switch(event.error) {
      case 'network':
        errorMessage = "Ağ bağlantısı yok. İnternet bağlantınızı kontrol edin.";
        break;
      case 'no-speech':
        errorMessage = "Hiçbir ses algılanmadı. Tekrar deneyin.";
        break;
      case 'audio-capture':
        errorMessage = "Mikrofon erişimi reddedildi.";
        break;
      case 'not-allowed':
        errorMessage = "Mikrofon izni gerekli. Tarayıcı ayarlarını kontrol edin.";
        break;
    }
    
    if (onError) onError(errorMessage);
  };

  recognition.onend = () => {
    isListening = false;
    console.log("🎤 Mikrofon kapandı.");
  };

  return {
    isSupported: true,
    isListening: () => isListening,
    startListening: () => {
      try {
        recognition.start();
      } catch (err) {
        console.error("Mikrofon başlatılamadı:", err);
      }
    },
    stopListening: () => {
      recognition.stop();
    }
  };
};
