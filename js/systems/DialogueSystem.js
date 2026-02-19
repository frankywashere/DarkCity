class DialogueSystem {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.dialogueQueue = [];
        this.currentDialogue = null;
        this.isTyping = false;
        this.fullText = '';
        this.charIndex = 0;
        this.typeSpeed = 30;

        // UI elements
        this.container = scene.add.container(0, 0).setDepth(150).setAlpha(0);

        this.box = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'dialogue_box').setScrollFactor(0);
        this.speakerText = scene.add.text(GAME_WIDTH / 2 - 370, GAME_HEIGHT - 130, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#4488ff',
        }).setScrollFactor(0);
        this.dialogueText = scene.add.text(GAME_WIDTH / 2 - 370, GAME_HEIGHT - 112, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ccccdd',
            wordWrap: { width: 740 }, lineSpacing: 3,
        }).setScrollFactor(0);
        this.continueIndicator = scene.add.text(GAME_WIDTH / 2 + 370, GAME_HEIGHT - 45, '>>>', {
            fontFamily: 'monospace', fontSize: '12px', color: '#4488ff',
        }).setScrollFactor(0).setOrigin(1, 0.5);

        this.container.add([this.box, this.speakerText, this.dialogueText, this.continueIndicator]);

        // Blink indicator
        scene.tweens.add({
            targets: this.continueIndicator,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 500,
        });

        // Input
        this.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    show(dialogues) {
        this.dialogueQueue = [...dialogues];
        this.isActive = true;
        this.container.setAlpha(1);
        this.nextDialogue();
    }

    nextDialogue() {
        if (this.dialogueQueue.length === 0) {
            this.hide();
            return;
        }

        this.currentDialogue = this.dialogueQueue.shift();
        this.speakerText.setText(this.currentDialogue.speaker || '');
        this.fullText = this.currentDialogue.text;
        this.dialogueText.setText('');
        this.charIndex = 0;
        this.isTyping = true;

        this.typeEvent = this.scene.time.addEvent({
            delay: this.typeSpeed,
            repeat: this.fullText.length - 1,
            callback: () => {
                this.charIndex++;
                this.dialogueText.setText(this.fullText.substring(0, this.charIndex));
                if (this.charIndex >= this.fullText.length) {
                    this.isTyping = false;
                }
            }
        });
    }

    hide() {
        this.isActive = false;
        this.container.setAlpha(0);
        this.scene.events.emit('dialogueComplete');
    }

    update() {
        if (!this.isActive) return;

        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            if (this.isTyping) {
                this.isTyping = false;
                if (this.typeEvent) this.typeEvent.destroy();
                this.dialogueText.setText(this.fullText);
            } else {
                this.nextDialogue();
            }
        }
    }
}
