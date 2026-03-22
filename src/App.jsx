import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';
import backgroundCard from './ui/northchild-card.webp';
import nameButtonImg from './ui/name_button.webp';
import entranceBg from './ui/entrance_bg.webp';
import gameplayGuideImg from './ui/gameplay.webp';
import html2canvas from 'html2canvas';
import BroadcastModal from './components/BroadcastModal';
import EndgameModal from './components/EndgameModal';
import { computeNorthchildResult } from './northchildMechanics';

// Animal Glyph imports
import bearGlyph from './assets/bear_glyph.webp';
import owlGlyph from './assets/owl_glyph.webp';
import eagleGlyph from './assets/eagle_glyph.webp';
import serpentGlyph from './assets/serpent_glyph.webp';
import wolfGlyph from './assets/wolf_glyph.webp';
import stagGlyph from './assets/stag_glyph.webp';
import orcaGlyph from './assets/orca_glyph.webp';
import ravenGlyph from './assets/raven_glyph.webp';

function App() {
  const [sagaName, setSagaName] = useState('');
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [slotData, setSlotData] = useState({});
  const [boardId, setBoardId] = useState(null);
  const [activeSlot, setActiveSlot] = useState(null);
  const [ritualError, setRitualError] = useState(null); 
  const [isChronicleOpen, setIsChronicleOpen] = useState(false);
  const [chronicleSlotId, setChronicleSlotId] = useState('0');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // --- ENDGAME STATE ---
  const [isEndgameModalOpen, setIsEndgameModalOpen] = useState(false);
  const [endgameStep, setEndgameStep] = useState('summary'); // 'summary' or 'result'
  const [computedResult, setComputedResult] = useState(null);
  const fateBookCount = Object.keys(slotData).filter(key => key.includes('-slot-') && slotData[key]).length;
  const isEndgameReady = fateBookCount >= 15;

  const animals = [
    'Winter-Keeper', 'Night-Watcher', 'Sky-Warden', 'Coil-Weaver',
    'Pack-Hunter', 'Oath-Stag', 'Deep-Kin', 'Omen-Bearer'
  ];

// This maps exactly to the data the BroadcastModal expects
  const animalData = [
    { id: '0', name: 'Winter-Keeper', role: 'BEAR' },
    { id: '1', name: 'Night-Watcher', role: 'OWL' },
    { id: '2', name: 'Sky-Warden', role: 'EAGLE' },
    { id: '3', name: 'Coil-Weaver', role: 'SERPENT' },
    { id: '4', name: 'Pack-Hunter', role: 'WOLF' },
    { id: '5', name: 'Oath-Stag', role: 'STAG' },
    { id: '6', name: 'Deep-Kin', role: 'ORCA' },
    { id: '7', name: 'Omen-Bearer', role: 'RAVEN' }
  ];

  const toggleRune = async (id) => {
    const updatedData = { ...slotData };
    // Toggle between active (1) and inactive (undefined/0)
    if (updatedData[id]) {
      delete updatedData[id];
    } else {
      updatedData[id] = true;
    }
    setSlotData(updatedData);
    saveToCloud(updatedData);
  };

  const logout = () => {
  localStorage.clear();
  window.location.reload();
  };

  const shareBoard = async () => {
    const element = document.querySelector('.game-card');
    if (!element) return;

    let generatedBlob = null; // The rescue net for the image data

    try {
      const clipboardItem = new ClipboardItem({
        'image/png': new Promise(async (resolve, reject) => {
          const images = element.querySelectorAll('img');
          const originalSrcs = [];

          try {
            const loadPromises = Array.from(images).map((img) => {
              const isExternal = img.src.includes('http') && !img.src.includes(window.location.origin);
              
              if (isExternal && !img.src.includes('wsrv.nl')) {
                originalSrcs.push({ img, src: img.src });
                return new Promise((res) => {
                  img.onload = res;
                  img.onerror = res;
                  img.src = `https://wsrv.nl/?url=${encodeURIComponent(img.src)}`;
                });
              }
              return Promise.resolve();
            });

            await Promise.all(loadPromises);

            const canvas = await html2canvas(element, {
              useCORS: true,
              allowTaint: false,
              backgroundColor: null,
              scale: 2,
            });

            originalSrcs.forEach(({ img, src }) => { img.src = src; });

            canvas.toBlob((blob) => {
              if (blob) {
                generatedBlob = blob; // Save the image to our rescue net
                resolve(blob);
              } else {
                reject(new Error("Canvas to Blob failed"));
              }
            }, 'image/png');

          } catch (innerErr) {
            originalSrcs.forEach(({ img, src }) => { img.src = src; });
            reject(innerErr);
          }
        })
      });

      await navigator.clipboard.write([clipboardItem]);
      alert("The Saga image has been copied to your clipboard!");

    } catch (err) {
      console.error("Clipboard blocked:", err);
      // THE SAFARI ESCAPE HATCH
      if (generatedBlob) {
        // If the clipboard fails but we successfully made the image, show it!
        setCapturedImage(URL.createObjectURL(generatedBlob));
      } else {
        alert("Capture failed. Please try taking a manual screenshot.");
      }
    }
  };

  const getAnimalArchetype = (slotId) => {
    const mapping = {
      'Winter-Keeper': 'Bear',
      'Night-Watcher': 'Owl',
      'Sky-Warden': 'Eagle',
      'Coil-Weaver': 'Serpent',
      'Pack-Hunter': 'Wolf',
      'Oath-Stag': 'Elk',
      'Deep-Kin': 'Orca',
      'Omen-Bearer': 'Raven'
    };
    // Use the same split/slice/join logic here
  const animalKey = slotId.split('-').slice(0, 2).join('-');
  return mapping[animalKey] || 'Spirit';
};

  // 1. AUTO-LOGIN: Checks browser memory for a saved Saga
  useEffect(() => {
    const savedSaga = localStorage.getItem('northchild_saga');
    const savedPin = localStorage.getItem('northchild_pin');
    
    if (savedSaga && savedPin) {
      setSagaName(savedSaga);
      setPin(savedPin);
      
      const autoLoad = async () => {
        try {
          const { data } = await supabase
            .from('boards')
            .select('*')
            .eq('saga_name', savedSaga.toLowerCase())
            .eq('pin', savedPin)
            .maybeSingle();
          
          if (data) {
            setSlotData(data.slot_data || {});
            setBoardId(data.id);
            setIsAuthorized(true); // <--- This opens the door!
          }
        } catch (err) {
          console.error("Auto-load failed:", err);
        } finally {
          setIsLoading(false); // <--- This stops the "black screen"
        }
      };
      autoLoad();
    } else {
      setIsLoading(false); // No saved saga, show login immediately
    }
  }, []);

  // 2. IDENTIFY SAGA: The "Login" logic
  const identifySaga = async (e) => {
    e.preventDefault();
    if (!sagaName || !pin) return;
    const normalizedSaga = sagaName.toLowerCase().trim();

    const { data } = await supabase
      .from('boards')
      .select('*')
      .eq('saga_name', normalizedSaga)
      .eq('pin', pin)
      .maybeSingle();

    if (data) {
      setSlotData(data.slot_data || {});
      setBoardId(data.id);
    } else {
      const { data: newBoard } = await supabase
        .from('boards')
        .insert([{ saga_name: normalizedSaga, pin: pin, slot_data: {} }])
        .select().single();
      if (newBoard) {
        setBoardId(newBoard.id);
        setSlotData({});
      }
    }

    localStorage.setItem('northchild_saga', normalizedSaga);
    localStorage.setItem('northchild_pin', pin);
    
    // --- THE CINEMATIC FADE TRIGGER ---
    setIsTransitioning(true); // Mounts the board silently in the background
    
    setTimeout(() => {
      setIsAuthorized(true); // Officially grants access
      setIsTransitioning(false); // Cleans up the transition state
    }, 2000); // 2000ms = 2 seconds of fading
  };

  const saveToCloud = async (newData) => {
    if (!boardId) return;

    const { data, error } = await supabase
      .from('boards')
      .update({ slot_data: newData })
      .eq('id', boardId)
      .select();

    if (error) {
      console.error("Save Error:", error);
      alert("Cloud Save Failed: Check your internet or Supabase connection.");
    } else if (!data || data.length === 0) {
      console.error("Save Blocked: 0 rows updated.");
      alert("Save blocked! The database refused to update the row.");
    }
  };

  const handlePasteUrl = async (url) => {
    if (!url) return;
    const updatedData = { ...slotData, [activeSlot]: url };
    setSlotData(updatedData);
    saveToCloud(updatedData);
    closeModal();
  };

  const clearSlot = async () => {
    const updatedData = { ...slotData };
    delete updatedData[activeSlot];
    setSlotData(updatedData);
    saveToCloud(updatedData);
    closeModal();
  };

  const closeModal = () => {
    setActiveSlot(null);
  };
  if (isLoading) return <div style={{background: '#1a1a1a', height: '100vh'}} />;

  const handleSlotClick = (id, animal) => {
    if (id.includes('slot-')) {
      const sacrificeKey = `${animal}-text`;
      
      // 1. Check if the path is open
      if (!slotData[sacrificeKey]) {
        setRitualError({
          archetype: getAnimalArchetype(id),
          name: animal
        });
        setTimeout(() => setRitualError(null), 4000);
        return; 
      }

      // 2. THE 15-BOOK LOCKOUT
      // If the game is ready (15 books) AND the slot they clicked is empty, block it!
      if (isEndgameReady && !slotData[id]) {
        setRitualError({
          isFullState: true // A custom flag so the toast knows what to display
        });
        setTimeout(() => setRitualError(null), 4000);
        return;
      }
    }
    setActiveSlot(id);
  };

  // --- ENDGAME TRANSLATOR ---
  const prepareFateData = () => {
    const counts = { wolf: 0, orca: 0, serpent: 0, raven: 0, owl: 0, eagle: 0, elk: 0, bear: 0 };
    const mapping = {
      'Pack-Hunter': 'wolf', 'Deep-Kin': 'orca', 'Coil-Weaver': 'serpent', 'Omen-Bearer': 'raven',
      'Night-Watcher': 'owl', 'Sky-Warden': 'eagle', 'Oath-Stag': 'elk', 'Winter-Keeper': 'bear'
    };

    Object.keys(slotData).forEach(key => {
      if (key.includes('-slot-') && slotData[key]) {
        const gameName = key.split('-slot-')[0]; 
        const engineName = mapping[gameName];
        if (engineName && counts[engineName] < 4) counts[engineName]++;
      }
    });

    const hfCount = [0, 1, 2, 3, 4].filter(i => slotData[`highflame-${i}`]).length;
    const gsCount = [0, 1, 2, 3, 4].filter(i => slotData[`gravesong-${i}`]).length;
    return { counts, hfCount, gsCount };
  };

  const currentFateData = isEndgameModalOpen ? prepareFateData() : null;

  const calculateFate = () => {
    const { counts, hfCount, gsCount } = prepareFateData();
    // Remember to import computeNorthchildResult at the top of App.jsx!
    const result = computeNorthchildResult(counts, hfCount, gsCount);
    setComputedResult(result);
    setEndgameStep('result'); 
  };

  return (
    <div className="app-container">
    
      {/* 1. THE GAME BOARD (Renders when authorized OR during the fade transition) */}
      {(isAuthorized || isTransitioning) && (
        <>
          <div className="game-card" style={{ backgroundImage: `url(${backgroundCard})` }}>
            {animals.map((animal, index) => (
              <React.Fragment key={animal}>
                <div className={`slot-single block-${index}`} onClick={() => handleSlotClick(`${animal}-text`, animal)}>
                  {slotData[`${animal}-text`] ? (
                    <img src={slotData[`${animal}-text`]} alt="cover" />
                  ) : (
                    <span className="plus">+</span>
                  )}
                </div>
                
                <div className={`slot-row row-${index}`}>
                  {[1, 2, 3, 4].map(num => {
                    const id = `${animal}-slot-${num}`;
                    return (
                      <div key={id} className="slot-item" onClick={() => handleSlotClick(id, animal)}>
                        {slotData[id] ? (
                          <img src={slotData[id]} alt="cover" />
                        ) : (
                          <span className="plus">+</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Rune Clusters */}
                <div className="rune-cluster highflame-cluster">
                  {[0, 1, 2, 3, 4].map(i => (
                    <img 
                      key={`hf-${i}`}
                      src="/runes/highflame.svg" 
                      className={`rune-icon ${slotData[`highflame-${i}`] ? 'active' : ''}`}
                      onClick={() => toggleRune(`highflame-${i}`)}
                      alt="Highflame Rune"
                    />
                  ))}
                </div>

                <div className="rune-cluster gravesong-cluster">
                  {[0, 1, 2, 3, 4].map(i => (
                    <img 
                      key={`gs-${i}`}
                      src="/runes/gravesong.svg" 
                      className={`rune-icon ${slotData[`gravesong-${i}`] ? 'active' : ''}`}
                      onClick={() => toggleRune(`gravesong-${i}`)}
                      alt="Gravesong Rune"
                    />
                  ))}
                </div>
              </React.Fragment>
            ))}

            {/* THE NEW ON-BOARD ENDGAME TRIGGER */}
            {isEndgameReady && (
              <button 
                className="seal-saga-btn"
                onClick={() => {
                  setEndgameStep('summary');
                  setIsEndgameModalOpen(true);
                }}
              >
                <img src={nameButtonImg} alt="Set Her Name" />
              </button>
            )}
          </div>

          {/* RITUAL MODAL (For Pasting URLs) */}
          {activeSlot && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="ritual-header">
                  {activeSlot.includes('-text') ? (
                    <>
                      <p className="ritual-command">Sacrifice a book to the</p>
                      <h3 className="ritual-title">{activeSlot.split('-').slice(0, 2).join('-')}</h3>
                      <p className="ritual-subtitle">Open the Path of the {getAnimalArchetype(activeSlot)}</p>
                    </>
                  ) : (
                    <>
                      <p className="ritual-command">Invoke the</p>
                      <h3 className="ritual-title">{activeSlot.split('-').slice(0, 2).join('-')}</h3>
                      <p className="ritual-subtitle">And Let Her Fate Be Guided</p>
                    </>
                  )}
                </div>

                <input 
                  type="text"
                  placeholder="Paste Image URL..."
                  onPaste={(e) => handlePasteUrl(e.clipboardData.getData('text'))}
                  onChange={(e) => {
                    if (e.target.value.startsWith('http')) handlePasteUrl(e.target.value);
                  }}
                  autoFocus 
                />

                {slotData[activeSlot] && (
                  <button onClick={clearSlot} className="clear-button">
                    Clear This Slot
                  </button>
                )}
              </div>
            </div>
          )}

          {/* RITUAL ERROR TOAST */}
          {ritualError && (
            <div className="ritual-error-toast">
              {ritualError.isFullState ? (
                <>
                  <p className="error-path">The fate is woven</p>
                  <h3 className="error-title">15 OFFERINGS MADE</h3>
                  <p className="error-must">Set Her Name or clear an existing book to alter the path</p>
                </>
              ) : (
                <>
                  <p className="error-path">A book must first be sacrificed to the</p>
                  <h3 className="error-title">{ritualError.name}</h3>
                  <p className="error-must">to open the Path of the {ritualError.archetype}</p>
                </>
              )}
            </div>
          )}

          <div className="saga-dashboard">
            <button onClick={() => setIsChronicleOpen(true)} className="dashboard-link">
              Open Chronicle
            </button>
            <button onClick={() => setIsGuideOpen(true)} className="dashboard-link">
              Gameplay Guide
            </button>
            <button onClick={shareBoard} className="dashboard-link">
              Copy Card Image
            </button>
            <button onClick={logout} className="dashboard-link">
              Abandon Saga
            </button>
          </div>
        </>
      )}

      {/* 2. THE THRESHOLD LOGIN (Renders if NOT fully authorized yet) */}
      {!isAuthorized && (
        <div className={`login-screen ${isTransitioning ? 'fade-out' : ''}`}>
          <div className="login-container" style={{ backgroundImage: `url(${entranceBg})` }}>
            <div className="login-form-area">
              <form onSubmit={identifySaga}>
                <input 
                  placeholder="Player Name (ex: Bastiat)" 
                  value={sagaName}
                  onChange={(e) => setSagaName(e.target.value)}
                />
                <input 
                  type="password" 
                  maxLength="4" 
                  placeholder="4-DIGIT PIN" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <button type="submit" className="login-submit-btn">
                  And thus the North shall know its Child
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. THE CHRONICLE MODAL INJECTION */}
      {isChronicleOpen && (
        <BroadcastModal 
          slotId={chronicleSlotId}
          selections={{
            0: bearGlyph,
            1: owlGlyph,
            2: eagleGlyph,
            3: serpentGlyph,
            4: wolfGlyph,
            5: stagGlyph,
            6: orcaGlyph,
            7: ravenGlyph
          }}
          slotData={slotData} 
          animalData={animalData}
          onClose={() => setIsChronicleOpen(false)}
          onNavigate={(id) => setChronicleSlotId(id)}
        />
      )}

      {/* 4. ENDGAME MODAL */}
      <EndgameModal 
        isOpen={isEndgameModalOpen}
        step={endgameStep}
        fateData={currentFateData}
        computedResult={computedResult}
        onCalculate={calculateFate}
        onClose={() => {
          setIsEndgameModalOpen(false);
          setEndgameStep('summary'); 
        }}
      />
      {/* SAFARI FALLBACK MODAL */}
      {capturedImage && (
        <div className="modal-overlay" onClick={() => setCapturedImage(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ textAlign: 'center', width: '95%', maxWidth: '650px' }}
          >
            <h3 className="ritual-title" style={{ fontSize: '1.5rem', marginBottom: '15px' }}>
              Destiny Scribed
            </h3>
            
            <img 
              src={capturedImage} 
              alt="Captured Board" 
              style={{ width: '100%', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }} 
            />
            
            <p className="ritual-subtitle" style={{ opacity: 1, marginTop: '20px', fontSize: '1rem' }}>
              Long-press the image above to Copy or Save to Photos.
            </p>
            
            <button 
              onClick={() => setCapturedImage(null)} 
              style={{
                marginTop: '20px', background: 'none', border: '1px solid rgba(75, 87, 109, 0.5)',
                color: '#e7dfd5', padding: '10px 20px', fontFamily: 'Norse', cursor: 'pointer'
              }}
            >
              Return to Saga
            </button>
          </div>
        </div>
      )}

      {isGuideOpen && (
        <div className="guide-overlay" onClick={() => setIsGuideOpen(false)}>
          <div className="guide-content">
            <img src={gameplayGuideImg} alt="Gameplay Guide" className="guide-image" />
            <p className="guide-close-hint">Click anywhere to return to the Saga</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;