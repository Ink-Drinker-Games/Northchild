import React, { useState } from 'react';
import { getResultImagePath } from '../northchildMechanics';

// --- THE BACKGROUND IMPORT ---
import endgameBg from '../ui/northchild_end.webp';
import submitButtonImg from '../ui/submit_button.webp';
import hfEndImg from '../ui/hf_end.webp';
import gsEndImg from '../ui/gs_end.webp';

// Animal Glyph imports
import bearGlyph from '../assets/bear_glyph.webp';
import owlGlyph from '../assets/owl_glyph.webp';
import eagleGlyph from '../assets/eagle_glyph.webp';
import serpentGlyph from '../assets/serpent_glyph.webp';
import wolfGlyph from '../assets/wolf_glyph.webp';
import stagGlyph from '../assets/stag_glyph.webp';
import orcaGlyph from '../assets/orca_glyph.webp';
import ravenGlyph from '../assets/raven_glyph.webp';


export default function EndgameModal({ 
  isOpen, step, fateData, computedResult, onCalculate, onClose 
}) {
  const [capturedImage, setCapturedImage] = useState(null); // <-- ADD THIS

  if (!isOpen) return null;

  const topAnimals = [
    { title: "WINTER\nKEEPER", key: 'bear', img: bearGlyph },
    { title: "NIGHT\nWATCHER", key: 'owl', img: owlGlyph },
    { title: "SKY\nWARDEN", key: 'eagle', img: eagleGlyph },
    { title: "COIL\nWEAVER", key: 'serpent', img: serpentGlyph }
  ];
  
  const bottomAnimals = [
    { title: "PACK\nHUNTER", key: 'wolf', img: wolfGlyph },
    { title: "OATH\nSTAG", key: 'elk', img: stagGlyph },
    { title: "DEEP\nKIN", key: 'orca', img: orcaGlyph },
    { title: "OMEN\nBEARER", key: 'raven', img: ravenGlyph }
  ];

  // --- THE BULLETPROOF COPY FUNCTION (SAFARI ADAPTED + ESCAPE HATCH) ---
  const copyResultImage = async () => {
    if (!computedResult) return;

    let generatedBlob = null; // The rescue net

    try {
      const clipboardItem = new ClipboardItem({
        'image/png': new Promise((resolve, reject) => {
          const imgSrc = getResultImagePath(computedResult.winner.id, computedResult.variant);
          const img = new Image();
          img.crossOrigin = "anonymous"; 

          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
              if (blob) {
                generatedBlob = blob; // Save the image to our rescue net
                resolve(blob);
              } else {
                reject(new Error("Canvas to Blob failed"));
              }
            }, 'image/png');
          };

          img.onerror = () => reject(new Error("Image failed to load"));
          img.src = imgSrc; 
        })
      });

      await navigator.clipboard.write([clipboardItem]);
      alert("The Chronicle has been copied to your clipboard!");

    } catch (err) {
      console.error("Clipboard error:", err);
      // THE SAFARI ESCAPE HATCH
      if (generatedBlob) {
        setCapturedImage(URL.createObjectURL(generatedBlob));
      } else {
        alert("Apple security blocked the capture. Try a manual screenshot or long-press the image to save!");
      }
    }
  };

  return (
    <div className="endgame-screen">
      
      {/* 1. THE SUMMARY LAYOUT */}
      {step === 'summary' && fateData && (
        <div 
          className="endgame-summary-container"
          style={{ backgroundImage: `url(${endgameBg})` }}
        >
          {/* THE ESCAPE HATCH */}
          <button onClick={onClose} className="endgame-return-btn">
            RETURN TO SAGA
          </button>

          <div className="endgame-spirit-board">
            
            {/* TOP ROW STENCIL: Counts DOWN from top */}
            <div className="endgame-stencil-row top">
              {topAnimals.map((animal) => (
                <div key={animal.key} className={`animal-column ${animal.key}`}>
                  <div 
                    className="endgame-spirit-title" 
                    style={{ visibility: fateData.counts[animal.key] > 0 ? 'visible' : 'hidden' }}
                  >
                    {animal.title}
                  </div>
                  {[0, 1, 2, 3].map((i) => (
                    <img 
                      key={i} 
                      src={animal.img} 
                      className={`stencil-glyph slot-${i}`} 
                      style={{ visibility: i < fateData.counts[animal.key] ? 'visible' : 'hidden' }} 
                      alt="" 
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* MIDDLE ROW: Highflame / Gravesong Banner */}
            <div className="endgame-rune-banner">
              {fateData.hfCount === 5 && (
                <>
                  {/* Swapped to use hfEndImg */}
                  <img src={hfEndImg} alt="Highflame" className="endgame-banner-icon hf-icon" />
                  <span className="endgame-banner-text hf-text">HIGHFLAME</span>
                </>
              )}
              {fateData.gsCount === 5 && (
                <>
                  {/* Swapped to use gsEndImg */}
                  <img src={gsEndImg} alt="Gravesong" className="endgame-banner-icon gs-icon" />
                  <span className="endgame-banner-text gs-text">GRAVESONG</span>
                </>
              )}
            </div>

            {/* BOTTOM ROW STENCIL: Counts UP from bottom */}
            <div className="endgame-stencil-row bottom">
              {bottomAnimals.map((animal) => (
                <div key={animal.key} className={`animal-column ${animal.key}`}>
                  {[0, 1, 2, 3].map((i) => (
                    <img 
                      key={i} 
                      src={animal.img} 
                      className={`stencil-glyph slot-${i}`} 
                      style={{ visibility: i < fateData.counts[animal.key] ? 'visible' : 'hidden' }} 
                      alt="" 
                    />
                  ))}
                  <div 
                    className="endgame-spirit-title" 
                    style={{ visibility: fateData.counts[animal.key] > 0 ? 'visible' : 'hidden' }}
                  >
                    {animal.title}
                  </div>
                </div>
              ))}
            </div>

          </div> {/* END endgame-spirit-board */}

          <button onClick={onCalculate} className="endgame-submit-btn">
            <img 
              src={submitButtonImg} 
              alt="And Thus The North Shall Know Its Child" 
              className="submit-btn-img" 
            />
          </button>
        </div>
      )}

      {/* 2. THE RESULT SCREEN */}
      {step === 'result' && computedResult && (
        <div className="endgame-result-container">
          <img 
            src={getResultImagePath(computedResult.winner.id, computedResult.variant)} 
            alt="Final Fate" 
            className="endgame-final-graphic"
          />
          
          {/* THE NEW BUTTON ROW (Removed inline styles) */}
          <div className="endgame-result-controls">
            <button onClick={copyResultImage} className="meta-btn">
              Copy Image
            </button>
            <button onClick={onClose} className="meta-btn">
              Close Chronicle
            </button>
          </div>
          
        </div>
      )}
      {/* SAFARI FALLBACK MODAL */}
      {capturedImage && (
        <div className="modal-overlay" onClick={() => setCapturedImage(null)} style={{ zIndex: 300000 }}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ textAlign: 'center', width: '95%', maxWidth: '650px' }}
          >
            <h3 className="ritual-title" style={{ fontSize: '1.5rem', marginBottom: '15px' }}>
              Chronicle Scribed
            </h3>
            
            <img 
              src={capturedImage} 
              alt="Captured Result" 
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

    </div>
  );
}