document.addEventListener('DOMContentLoaded', () => {
    const mainHeader = document.getElementById('mainHeader');
    const sidebar = document.getElementById('sidebar');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const eventPageContent = document.getElementById('eventPageContent');

    let lastScrollY = window.scrollY;
    let isHeaderHidden = false;
    const scrollThreshold = 50;

    const homeButton = document.getElementById('homeButton');
    const renamePlayerButton = document.getElementById('renamePlayerButton');

    let playerName = localStorage.getItem('playerName') || 'Player';

    // header bullshit
    window.addEventListener('scroll', () => {
        if (sidebar.classList.contains('open')) {
            return;
        }

        if (window.scrollY > lastScrollY && window.scrollY > scrollThreshold) {
            if (!isHeaderHidden) {
                mainHeader.classList.add('header-hidden');
                isHeaderHidden = true;
            }
        } else if (window.scrollY < lastScrollY) {
            if (isHeaderHidden) {
                mainHeader.classList.remove('header-hidden');
                isHeaderHidden = false;
            }
        }
        lastScrollY = window.scrollY;
    });

    // sidebar
    hamburgerMenu.addEventListener('click', () => {
        toggleSidebar();
    });

    sidebarOverlay.addEventListener('click', () => {
        toggleSidebar();
    });

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        hamburgerMenu.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');

        if (sidebar.classList.contains('open')) {
            if (window.innerWidth > 768) {
                 eventPageContent.classList.add('shifted');
            }
        } else {
            eventPageContent.classList.remove('shifted');
        }
    }

    // prototype line break remover
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            eventPageContent.classList.remove('shifted');
        } else if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
            eventPageContent.classList.add('shifted');
        }
    });

    // reduce the length of the stuff I have to copy
    function populateCharacterDialogueBoxes() {
        document.querySelectorAll('.character-dialogue-box').forEach(dialogueBox => {
            if (dialogueBox.querySelector('.character-avatar')) {
                return;
            }

            const characterName = dialogueBox.dataset.characterName;
            const characterAvatar = dialogueBox.dataset.characterAvatar;
            const dialogueTextP = dialogueBox.querySelector('.dialogue-text');

            const avatarDiv = document.createElement('div');
            avatarDiv.classList.add('character-avatar');
            const avatarImg = document.createElement('img');
            avatarImg.src = characterAvatar;
            avatarImg.alt = characterName;
            avatarDiv.appendChild(avatarImg);

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('dialogue-content');
            const nameP = document.createElement('p');
            nameP.classList.add('character-name');
            nameP.textContent = characterName;

            contentDiv.appendChild(nameP);
            if (dialogueTextP) {
                contentDiv.appendChild(dialogueTextP);
            }

            dialogueBox.prepend(contentDiv);
            dialogueBox.prepend(avatarDiv);

            dialogueBox.style.display = 'flex';
        });
    }

    // sleepy mode
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        body.setAttribute('data-theme', 'dark');
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func(...args);
            }, delay);
        };
    };

    let currentBgImage = null;

    // background update when center of the screen is past the bg check
    function checkBackgroundScroll() {
        const triggers = document.querySelectorAll('.bg-scroll-trigger');
        const viewportCenter = window.innerHeight / 2;
        let newBg = null;

        for (let i = triggers.length - 1; i >= 0; i--) {
            const trigger = triggers[i];
            const rect = trigger.getBoundingClientRect();
            if (rect.top <= viewportCenter) {
                newBg = trigger.dataset.bgImage;
                break;
            }
        }

        // this situation (same background) will likely never happen but just in case
        if (newBg !== currentBgImage) {
            currentBgImage = newBg;
            if (newBg === 'none' || !newBg) {
                document.body.style.backgroundImage = '';
            } else {
                document.body.style.backgroundImage = `url('${newBg}')`;
            }
        }
    }
    
    // debounce to avoid a bunch of bgs scrolling
    const debouncedCheckBackgroundScroll = debounce(checkBackgroundScroll, 200);

    // sidebar content loading
    async function loadSidebar() {
        try {
            const response = await fetch('./manifest.json');
            if (!response.ok) return;
            
            const data = await response.json();
            const listContainer = document.querySelector('.chapter-list');
            
            listContainer.innerHTML = '';

            const urlParams = new URLSearchParams(window.location.search);
            const currentChapter = urlParams.get('chapter');

            // default
            let titleFound = false;

            data.forEach(group => {
                if (group.category && !group.hidden) {
                    const catLi = document.createElement('li');
                    catLi.classList.add('chapter-category');
                    catLi.textContent = group.category;
                    listContainer.appendChild(catLi);
                }

                if (group.items) {
                    group.items.forEach(item => {
                        if (currentChapter === item.id) {
                            document.title = item.pageTitle || item.title;
                            titleFound = true;
                        }

                        if (group.hidden || item.hidden) {
                            return; 
                        }

                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        
                        a.href = `reader.html?chapter=${item.id}`;
                        a.textContent = item.title;

                        if (currentChapter === item.id) {
                            a.style.fontWeight = 'bold';
                            a.style.color = 'var(--accent-color)';
                        }

                        li.appendChild(a);
                        listContainer.appendChild(li);
                    });
                }
            });

            if (!titleFound) {
                document.title = "Story Reader"; 
            }

        } catch (error) {
            console.error('Error loading sidebar manifest:', error);
        }
    }

    // story loading
    async function loadStory(jsonPath) {
      try {
          const response = await fetch(jsonPath);
          const storyData = await response.json();

          eventPageContent.innerHTML = '';

          function renderDialogueItem(item, parentElement, isNested = false) {
              let dialogueBox;
              let displayText = processTextForDisplay(item.text, playerName);

              if (item.type === 'narrator') {
                  dialogueBox = document.createElement('div');
                  dialogueBox.classList.add('dialogue-box', 'narrator-box');
                  dialogueBox.innerHTML = `<p>${displayText}</p>`;
              } else if (item.type === 'character') {
                  dialogueBox = document.createElement('div');
                  dialogueBox.classList.add('dialogue-box', 'character-dialogue-box');
                  dialogueBox.setAttribute('data-character-name', item.name);
                  dialogueBox.setAttribute('data-character-avatar', item.avatar);
                  dialogueBox.innerHTML = `<p class="dialogue-text">${displayText}</p>`;
              } else if (item.type === 'note') {
                  dialogueBox = document.createElement('div');
                  dialogueBox.classList.add('dialogue-box');
                  dialogueBox.innerHTML = `<p style="font-size: 0.8em; opacity: 0.5; font-style: italic; text-align: center;">${displayText}</p>`;
              } else if (item.type === 'image') {
                dialogueBox = document.createElement('div');
                dialogueBox.classList.add('dialogue-box', 'image-display-box');
                let contentHtml = `<img src="${item.src}" style="width: 100%; height: auto; display: block; border-radius: 8px;">`;
                if (item.note) {
                    let displayNote = processTextForDisplay(item.note, playerName);
                    contentHtml += `<p style="font-size: 0.8em; opacity: 0.5; font-style: italic; text-align: center; margin-top: 24px;">${displayNote}</p>`;
                }
                dialogueBox.innerHTML = contentHtml;
            } else if (item.type === 'title') {
                dialogueBox = document.createElement('div');
                  dialogueBox.classList.add('dialogue-box');
                  dialogueBox.innerHTML = `<p style="font-size: 1.5em; text-align: center;">${displayText}</p>`;
              }

              if (dialogueBox) {
                  if (isNested) {
                      dialogueBox.classList.add('nested-dialogue');
                  }
                  parentElement.appendChild(dialogueBox);
              }
          }

          storyData.forEach(item => {
              if (item.type === 'choice') {
                  const choiceBox = document.createElement('div');
                  choiceBox.classList.add('dialogue-box', 'choice-display-box');

                  if (item.prompt) {
                      let displayPrompt = processTextForDisplay(item.prompt, playerName);
                      choiceBox.innerHTML += `<p class="choice-prompt">${displayPrompt}</p>`;
                  }
                  if (item.note) {
                      let displayNote = processTextForDisplay(item.note, playerName);
                      choiceBox.innerHTML += `<p style="font-size: 0.8em; opacity: 0.5; font-style: italic; text-align: center;">${displayNote}</p>`;
                  }

                  const choiceOutcomesDiv = document.createElement('div');
                  choiceOutcomesDiv.classList.add('choice-outcomes');

                  item.options.forEach(option => {
                      const choiceBranchDiv = document.createElement('div');
                      choiceBranchDiv.classList.add('choice-branch');
                      
                      let displayOptionText = processTextForDisplay(option.text, playerName);
                      choiceBranchDiv.innerHTML = `<div class="choice-option-display">${displayOptionText}</div>`;

                      if (option.dialogue_after_selection && option.dialogue_after_selection.length > 0) {
                          option.dialogue_after_selection.forEach(nestedItem => {
                              renderDialogueItem(nestedItem, choiceBranchDiv, true);
                          });
                      }
                      choiceOutcomesDiv.appendChild(choiceBranchDiv);
                  });
                  choiceBox.appendChild(choiceOutcomesDiv);
                  eventPageContent.appendChild(choiceBox);
              } else if (item.type === 'bg') {
                  const bgTrigger = document.createElement('div');
                  bgTrigger.classList.add('bg-scroll-trigger');
                  bgTrigger.setAttribute('data-bg-image', item.bg);
                  eventPageContent.appendChild(bgTrigger);
              } else {
                  renderDialogueItem(item, eventPageContent);
              }
          });

          populateCharacterDialogueBoxes();
          checkBackgroundScroll();

      } catch (error) {
          console.error('Error loading story:', error);
          eventPageContent.innerHTML = '<p>failed to load story content.<br>please contact the dumbass who made this website.</p>';
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const chapterId = urlParams.get('chapter');

    let jsonPath;

    if (chapterId) {
        jsonPath = `./${chapterId}.json`;
    } else {
        // legacy support
        const pathname = window.location.pathname;
        const parts = pathname.split('/');
        const htmlFileNameWithExtension = parts[parts.length - 1];
        const fileNameWithoutExtension = htmlFileNameWithExtension.split('.')[0];
        
        if (fileNameWithoutExtension === 'index' || fileNameWithoutExtension === 'reader') {
             jsonPath = './chapter-1.json';
        } else {
             jsonPath = `./${fileNameWithoutExtension}.json`;
        }
    }

    loadSidebar();
    loadStory(jsonPath);

    window.addEventListener('scroll', debouncedCheckBackgroundScroll);
    window.addEventListener('resize', debouncedCheckBackgroundScroll);

    // sending you to the shadow realm
    if (homeButton) {
      homeButton.addEventListener('click', () => {
        window.location.href = '../../index.html';
      });
    }

    // rename
    if (renamePlayerButton) {
        renamePlayerButton.addEventListener('click', () => {
          const newName = prompt('Replace [Player] with a name of your choice:');
          if (newName !== null && newName.trim() !== '') {
            playerName = newName.trim();
            localStorage.setItem('playerName', playerName);
            alert(`Name has been updated to "${playerName}"!`);
            
            loadStory(jsonPath);
          } else if (newName !== null) {
            alert('Nope. That cannot be empty.');
          }
        });
    }
});