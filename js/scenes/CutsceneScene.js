class CutsceneScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CutsceneScene' });
    }

    init(data) {
        this.cutsceneKey = data.cutsceneKey || 'awakening';
        this.nextScene = data.nextScene || 'Level1Scene';
        this.playerData = data.playerData || {};
    }

    create() {
        // Dark background
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000);

        // Get cutscene data
        const cutscene = this.getCutsceneData(this.cutsceneKey);

        this.dialogueIndex = 0;
        this.dialogues = cutscene.dialogues;
        this.illustrations = cutscene.illustrations || {};
        this.currentIllustrationKey = null;
        this.isTyping = false;
        this.fullText = '';

        // Title
        this.titleText = this.add.text(GAME_WIDTH / 2, 60, cutscene.title, {
            fontFamily: 'monospace', fontSize: '28px', color: '#4488ff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: this.titleText, alpha: 1, duration: 1000 });

        // Scene illustration image (above dialogue box, centered)
        // Use the first illustration as initial texture if available
        const firstIllustKey = this.illustrations[0] || 'cutscene_awakening_1';
        this.sceneImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, firstIllustKey)
            .setScale(1.1)
            .setAlpha(0)
            .setOrigin(0.5);

        // Subtle border around the illustration
        this.sceneBorder = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 400 * 1.1 + 4, 225 * 1.1 + 4)
            .setStrokeStyle(2, 0x4488ff, 0.4)
            .setFillStyle(0x000000, 0)
            .setAlpha(0);

        // Dialogue box
        this.dialogueBox = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 100, 'dialogue_box').setAlpha(0);

        // Speaker name
        this.speakerText = this.add.text(GAME_WIDTH / 2 - 370, GAME_HEIGHT - 155, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#4488ff',
        }).setAlpha(0);

        // Dialogue text
        this.dialogueText = this.add.text(GAME_WIDTH / 2 - 370, GAME_HEIGHT - 135, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ccccdd',
            wordWrap: { width: 740 }, lineSpacing: 4,
        }).setAlpha(0);

        // Continue prompt
        this.continueText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Press ENTER to continue', {
            fontFamily: 'monospace', fontSize: '11px', color: '#666688',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: this.continueText,
            alpha: 0.7,
            yoyo: true,
            repeat: -1,
            duration: 800,
        });

        // Skip text
        this.add.text(GAME_WIDTH - 20, 20, 'ESC to skip', {
            fontFamily: 'monospace', fontSize: '10px', color: '#444455',
        }).setOrigin(1, 0);

        // Show first dialogue after a delay
        this.time.delayedCall(1500, () => {
            this.dialogueBox.setAlpha(1);
            this.speakerText.setAlpha(1);
            this.dialogueText.setAlpha(1);
            this.continueText.setAlpha(0.5);
            this.sceneBorder.setAlpha(1);
            this.showDialogue(0);
        });

        // Input
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Ambient particles
        this.add.particles(GAME_WIDTH / 2, 0, 'particle_blue', {
            x: { min: -GAME_WIDTH / 2, max: GAME_WIDTH / 2 },
            y: { min: 0, max: GAME_HEIGHT },
            lifespan: 3000,
            speed: 20,
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.3, end: 0 },
            quantity: 1,
            frequency: 300,
        });
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.transitionToNext();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            if (this.isTyping) {
                // Skip to full text
                this.isTyping = false;
                this.dialogueText.setText(this.fullText);
            } else {
                // Next dialogue
                this.dialogueIndex++;
                if (this.dialogueIndex < this.dialogues.length) {
                    this.showDialogue(this.dialogueIndex);
                } else {
                    this.transitionToNext();
                }
            }
        }
    }

    showDialogue(index) {
        const d = this.dialogues[index];
        this.speakerText.setText(d.speaker);
        this.fullText = d.text;
        this.dialogueText.setText('');
        this.isTyping = true;

        // Check if this dialogue index triggers an illustration change
        if (this.illustrations[index] !== undefined) {
            const newKey = this.illustrations[index];
            if (newKey !== this.currentIllustrationKey) {
                this.changeIllustration(newKey);
            }
        }

        // Typewriter effect
        let charIndex = 0;
        const typeEvent = this.time.addEvent({
            delay: 30,
            repeat: this.fullText.length - 1,
            callback: () => {
                charIndex++;
                this.dialogueText.setText(this.fullText.substring(0, charIndex));
                if (charIndex >= this.fullText.length) {
                    this.isTyping = false;
                }
            }
        });
    }

    changeIllustration(newKey) {
        // If no current illustration is showing, just fade in directly
        if (this.currentIllustrationKey === null) {
            this.sceneImage.setTexture(newKey);
            this.tweens.add({
                targets: this.sceneImage,
                alpha: 1,
                duration: 600,
                ease: 'Power2',
            });
            this.currentIllustrationKey = newKey;
            return;
        }

        // Crossfade: fade out current, switch texture, fade in new
        this.tweens.add({
            targets: this.sceneImage,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                this.sceneImage.setTexture(newKey);
                this.tweens.add({
                    targets: this.sceneImage,
                    alpha: 1,
                    duration: 400,
                    ease: 'Power2',
                });
            }
        });

        this.currentIllustrationKey = newKey;
    }

    transitionToNext() {
        if (this.transitioning) return;
        this.transitioning = true;

        this.cameras.main.fadeOut(800, 0, 0, 0);
        // Use timer instead of camera event for reliable transition
        this.time.delayedCall(850, () => {
            this.scene.start(this.nextScene, this.playerData);
        });
    }

    getCutsceneData(key) {
        const cutscenes = {
            awakening: {
                title: 'THE AWAKENING',
                illustrations: {
                    0: 'cutscene_awakening_1',  // Dark hotel bathroom, bathtub
                    2: 'cutscene_awakening_2',  // Phone ringing, body on floor
                    5: 'cutscene_awakening_3',  // Dark corridor, shadowy figures
                },
                dialogues: [
                    { speaker: '', text: 'You wake in a bathtub. The water is cold. You don\'t remember how you got here.' },
                    { speaker: '', text: 'A hotel room. Unfamiliar. A dead woman on the floor. Blood that isn\'t yours.' },
                    { speaker: 'PHONE', text: '*ring* *ring* ... "Listen to me carefully. They\'re coming for you. You need to get out. NOW."' },
                    { speaker: 'DR. SCHREBER', text: '"My name is Dr. Schreber. I know what\'s happening to you, John. You are special."' },
                    { speaker: 'DR. SCHREBER', text: '"The men who are after you... they are called the Strangers. They are not what they seem."' },
                    { speaker: '', text: 'Strange sounds in the corridor. Footsteps. Whispers. Something is very wrong with this city.' },
                    { speaker: '', text: 'You have no choice. You have to run.' },
                ]
            },
            the_truth: {
                title: 'THE TRUTH',
                illustrations: {
                    0: 'cutscene_truth_1',  // Man with glowing blue hands, wall reshaping
                    2: 'cutscene_truth_2',  // Underground entrance, gothic archway
                    6: 'cutscene_truth_3',  // Dark city at midnight, buildings reshaping
                },
                dialogues: [
                    { speaker: '', text: 'The Stranger lies still. Something inside you has changed.' },
                    { speaker: '', text: 'When you reached out in desperation, the wall... moved. It responded to your will.' },
                    { speaker: 'DR. SCHREBER', text: '"You can tune, John. Like them. You can reshape reality itself."' },
                    { speaker: 'DR. SCHREBER', text: '"They\'ve been doing this to all of us. Every midnight, they stop the city. They reshape it."' },
                    { speaker: 'DR. SCHREBER', text: '"They swap our memories like playing cards. No one remembers who they really are."' },
                    { speaker: 'INSPECTOR BUMSTEAD', text: '"I don\'t know what\'s going on, but I know you\'re innocent. And I know this city isn\'t right."' },
                    { speaker: '', text: 'The truth is underground. The Strangers have a lair beneath the city. That\'s where the answers are.' },
                    { speaker: '', text: 'You can feel the power growing inside you. Time to find out what you really are.' },
                ]
            },
            the_injection: {
                title: 'THE INJECTION',
                illustrations: {
                    0: 'cutscene_injection_1',  // Strapped to alien machine, underground lair
                    3: 'cutscene_injection_2',  // Blue energy explosion, restraints shattering
                    5: 'cutscene_injection_3',  // Man floating with immense power, city below
                },
                dialogues: [
                    { speaker: '', text: 'They caught you. Strapped you to a machine deep underground.' },
                    { speaker: 'MR. BOOK', text: '"This one is... different. Interesting. He has the ability."' },
                    { speaker: 'DR. SCHREBER', text: '"I\'m sorry, John. They forced me. But I\'ve changed the injection..."' },
                    { speaker: 'DR. SCHREBER', text: '"Instead of their memories, I\'ve given you the power to fight back. Everything you need."' },
                    { speaker: '', text: 'The injection burns through your veins. The world fractures and reforms.' },
                    { speaker: '', text: 'You can feel EVERYTHING. Every wall, every stone, every molecule of this prison city.' },
                    { speaker: '', text: 'The restraints shatter. The Strangers recoil. They\'re afraid.' },
                    { speaker: '', text: 'It\'s time to end this. Shell Beach is real, and you will make it so.' },
                ]
            }
        };

        return cutscenes[key] || cutscenes.awakening;
    }
}
