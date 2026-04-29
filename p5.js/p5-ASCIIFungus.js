let globalCharmap = null;

function getCharmap() {
    if (!globalCharmap) {
        let chars = " .:-=+*#%@";
        let numChars = chars.length;
        let charW = 32;
        let charH = 32;
        globalCharmap = createGraphics(charW * numChars, charH);
        globalCharmap.background(0);
        globalCharmap.fill(255);
        globalCharmap.textAlign(CENTER, CENTER);
        globalCharmap.textSize(28);
        globalCharmap.textFont('monospace');
        for (let i = 0; i < numChars; i++) {
            // p5 text y-alignment can be tricky, passing charH/2 to align middle
            globalCharmap.text(chars[i], i * charW + charW / 2, charH / 2);
        }
    }
    return globalCharmap;
}

class ASCIIFungus {
    constructor({ x = 0, y = 0, size = 300, imgIndex = 0, gridScale = 10, animSpeed = 1.0, tintHex = '#A8CE40' }) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.imgIndex = imgIndex;
        this.gridScale = gridScale;
        this.animSpeed = animSpeed;
        this.tintHex = tintHex;
    }

    display(idx, time, pScale) {
        push();
        translate(this.x, this.y, idx * 0.5);

        let cMap = getCharmap();

        // stockImages and asciiShader are global from my-p5-sketch.js
        if (typeof asciiShader !== 'undefined' && typeof stockImages !== 'undefined' && stockImages.length > 0) {
            shader(asciiShader);

            let currentImg = stockImages[this.imgIndex % stockImages.length];

            asciiShader.setUniform('u_image', currentImg);
            asciiShader.setUniform('u_charmap', cMap);
            asciiShader.setUniform('u_time', time);
            asciiShader.setUniform('u_resolution', [this.size * 2, this.size * 2]);
            asciiShader.setUniform('u_gridScale', float(this.gridScale));
            asciiShader.setUniform('u_animSpeed', float(this.animSpeed));

            let tColor = color(this.tintHex);
            asciiShader.setUniform('u_tint', [red(tColor) / 255.0, green(tColor) / 255.0, blue(tColor) / 255.0]);

            noStroke();
            rect(-this.size, -this.size, this.size * 2, this.size * 2);
        }

        pop();
    }

    toJSON() {
        return {
            type: 'ASCIIFungus',
            x: this.x,
            y: this.y,
            size: this.size,
            imgIndex: this.imgIndex,
            gridScale: this.gridScale,
            animSpeed: this.animSpeed,
            tintHex: this.tintHex
        };
    }
}
