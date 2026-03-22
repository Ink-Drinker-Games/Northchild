import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import northchildBg from '../assets/northchild_broadcast_bg.webp'; 

export default function BroadcastModal({ slotId, selections, slotData, animalData, onClose, onNavigate }) {
  // We now have two separate dropdown states
  const [isLeftDropdownOpen, setIsLeftDropdownOpen] = useState(false);
  const [isRightDropdownOpen, setIsRightDropdownOpen] = useState(false);
  
  // Track which book slot (1, 2, 3, or 4) the user wants to feature
  const [activeBookSlot, setActiveBookSlot] = useState(1);
  const [capturedImage, setCapturedImage] = useState(null); 
  
  const chronicleRef = useRef(null); 

  const numericId = Number(slotId);
  const currentSlotData = animalData.find(a => Number(a.id) === numericId);
  const animalImg = selections[numericId];

  // Dynamically build the search key (e.g., "Pack-Hunter-slot-2") to pull the correct cover
  const bookKey = currentSlotData ? `${currentSlotData.name}-slot-${activeBookSlot}` : null;
  const bookImg = bookKey ? slotData[bookKey] : null; 

  const bookOptions = [
    { id: 1, label: "BOOK ONE" },
    { id: 2, label: "BOOK TWO" },
    { id: 3, label: "BOOK THREE" },
    { id: 4, label: "BOOK FOUR" }
  ];

  const handleCapture = async () => {
    if (!chronicleRef.current) return;

    let generatedBlob = null; // The rescue net

    try {
      // THE SAFARI TRICK: Hand the clipboard an "IOU" Promise immediately
      const clipboardItem = new ClipboardItem({
        'image/png': new Promise(async (resolve, reject) => {
          const images = chronicleRef.current.querySelectorAll('img');
          const originalSrcs = [];

          try {
            const loadPromises = Array.from(images).map((img) => {
              // Check if the image is external (ignores localhost and your live domain)
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

            const canvas = await html2canvas(chronicleRef.current, {
              useCORS: true,
              allowTaint: false,
              backgroundColor: null,
              scale: 2
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

      // Execute the write command using the Promise-based item
      await navigator.clipboard.write([clipboardItem]);
      alert("The Destiny has been captured and copied.");

    } catch (err) {
      console.error("Capture Error:", err);
      // THE SAFARI ESCAPE HATCH
      if (generatedBlob) {
        setCapturedImage(URL.createObjectURL(generatedBlob));
      } else {
        alert("Apple security blocked the capture. Try a manual screenshot or long-press the final image to save!");
      }
    }
  };

  return (
    <div className="ledger-wrapper"> 
      
      <div className="broadcast-content northchild-frame" ref={chronicleRef} style={{ backgroundImage: `url(${northchildBg})` }}>
        
        <div className="northchild-hero-stage">
          
          {/* LEFT: ANIMAL LANE */}
          <div className="northchild-hero-lane">
            <div 
              className="northchild-lane-header title-dropdown" 
              onClick={() => {
                setIsLeftDropdownOpen(!isLeftDropdownOpen);
                setIsRightDropdownOpen(false); // Close the other dropdown to prevent overlap
              }}
            >
              {currentSlotData ? currentSlotData.name.toUpperCase() : "PACK-HUNTER"}
              <span className="dropdown-arrow">
                {isLeftDropdownOpen ? '▲' : '▼'}
              </span>

              {isLeftDropdownOpen && (
                <ul className="custom-dropdown-list inline-list">
                  {animalData.map((animal) => (
                    <li 
                      key={animal.id} 
                      className="custom-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        onNavigate(animal.id);
                        setIsLeftDropdownOpen(false);
                      }}
                    >
                      {animal.name.toUpperCase()}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="chronicle-asset-wrapper glyph-nudge">
              {animalImg ? (
                <img src={animalImg} alt="Animal Token" className="northchild-animal-art" />
              ) : (
                <div className="hero-placeholder">UNCLAIMED</div>
              )}
            </div>
          </div>

          {/* RIGHT: BOOK LANE */}
          <div className="northchild-hero-lane">
            
            {/* Added book-title-nudge here! */}
            <div 
              className="northchild-lane-header title-dropdown book-title-nudge" 
              onClick={() => {
                setIsRightDropdownOpen(!isRightDropdownOpen);
                setIsLeftDropdownOpen(false); 
              }}
            >
              {bookOptions.find(b => b.id === activeBookSlot)?.label || "BOOK ONE"}
              <span className="dropdown-arrow">
                {isRightDropdownOpen ? '▲' : '▼'}
              </span>

              {isRightDropdownOpen && (
                <ul className="custom-dropdown-list inline-list">
                  {bookOptions.map((book) => (
                    <li 
                      key={book.id} 
                      className="custom-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        setActiveBookSlot(book.id);
                        setIsRightDropdownOpen(false);
                      }}
                    >
                      {book.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="chronicle-asset-wrapper book-nudge">
              {bookImg ? (
                <img src={bookImg} alt="Hero Book" className="northchild-book-art" />
              ) : (
                <div className="hero-placeholder">NOT YET INVOKED</div>
              )}
            </div>
          </div>

        </div>
      </div> 

      <div className="ledger-controls subdued-controls">
        <button className="meta-btn" onClick={handleCapture}>
          <span>Copy to Clipboard</span>
        </button>
        <button className="meta-btn" onClick={onClose}>
          <span>Return to the Card</span>
        </button>
      </div>
    </div>
  );
}