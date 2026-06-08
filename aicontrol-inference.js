/**
 * AI Control - Live Stream & Inference Display
 * Handles real-time camera streaming and Edge Impulse inference results
 */

class InferenceDisplay {
    constructor() {
        this.feedImg = document.getElementById('esp32Feed');
        this.canvas = document.getElementById('inferenceCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.feedContainer = document.getElementById('feedContainer');
        this.inferenceContent = document.getElementById('inferenceContent');
        this.classificationResults = document.getElementById('classificationResults');
        this.detectionResults = document.getElementById('detectionResults');
        this.feedStatus = document.getElementById('feedStatus');
        
        this.lastInferenceTime = 0;
        this.streamRefreshRate = Infinity; // Disable periodic stream updates
        this.inferencePollingRate = 1000; // Poll for background results every 1s
        this.lastStreamUpdate = 0;
        this.lastInferencePoll = 0;
        this.pendingInferenceData = null; // Buffer to draw boxes after img load
        
        this.init();
    }

    init() {
        // Resize canvas to match image dimensions when image loads
        this.feedImg.onload = () => {
            this.resizeCanvas();
            this.updateFeedStatus('Connected', true);
            if (this.pendingInferenceData) {
                this.drawBoundingBoxes(this.pendingInferenceData);
                this.pendingInferenceData = null;
            }
        };
        
        this.feedImg.onerror = () => {
            this.updateFeedStatus('Connection Error', false);
        };

        // Start the update loop
        this.startUpdateLoop();

        // Show initial placeholder
        this.updatePlaceholder(true);
    }

    updateStreamFrame() {
        // Add timestamp to bypass browser cache
        const timestamp = Date.now();
        this.feedImg.src = `/stream?t=${timestamp}`;
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const rect = this.feedImg.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    startUpdateLoop() {
        setInterval(() => {
            const now = Date.now();
            
            // Poll inference results at specified rate regardless of stream
            if (now - this.lastInferencePoll > this.inferencePollingRate) {
                this.pollInferenceResults();
                this.lastInferencePoll = now;
            }
        }, 50);
    }

    pollInferenceResults() {
        // Respect the UI configuration states
        const config = window.aiConfig;
        const isAiEnabled = config && config.aiSystem && config.aiSystem.enabled;
        const isDetectionActive = config && config.aiSystem && (config.aiSystem.maskedFaceDetection || config.aiSystem.weaponDetection);

        if (!isAiEnabled || !isDetectionActive) {
            this.updatePlaceholder(true, 'AI Threat Detection is Disabled');
            this.feedImg.style.display = 'none';
            this.canvas.style.display = 'none';
            return;
        }

        fetch('/api/inference')
            .then(response => response.json())
            .then(data => {
                this.pendingInferenceData = data;
                this.displayInferenceResults(data);
            })
            .catch(error => {
                console.error('Error fetching inference results:', error);
            });
    }

    displayInferenceResults(data) {
        try {
            // Update timing info
            const totalTime = (data.dsp_time + data.classification_time).toFixed(0);
            document.getElementById('dspTime').textContent = data.dsp_time.toFixed(0);
            document.getElementById('classTime').textContent = data.classification_time.toFixed(0);
            document.getElementById('totalTime').textContent = totalTime;
            document.getElementById('inferenceTime').textContent = totalTime + 'ms';

            // Check if we have bounding boxes (object detection)
            if (data.bounding_boxes && data.bounding_boxes.length > 0) {
                this.updatePlaceholder(false);
                this.feedImg.style.display = 'block';
                this.canvas.style.display = 'block';
                
                // Trigger frame update only when detection occurs
                this.updateStreamFrame();
                this.displayObjectDetection(data);
            } else {
                this.updatePlaceholder(true, 'No Threatful Situations have been detected');
                this.feedImg.style.display = 'none';
                this.canvas.style.display = 'none';
                this.displayClassification(data);
                this.pendingInferenceData = null;
            }

            this.lastInferenceTime = data.timestamp;
        } catch (error) {
            console.error('Error displaying inference results:', error);
        }
    }

    displayClassification(data) {
        this.classificationResults.style.display = 'block';
        this.detectionResults.style.display = 'none';
        this.canvas.style.display = 'none';

        const confidence = (data.confidence * 100).toFixed(1);
        document.getElementById('labelName').textContent = data.top_label || 'Unknown';
        document.getElementById('labelConfidence').textContent = confidence + '%';

        // Update status color based on confidence
        const labelDiv = document.getElementById('topLabel');
        if (confidence > 75) {
            labelDiv.style.backgroundColor = '#e8f5e9';
            labelDiv.style.borderLeft = '3px solid #2e7d32';
        } else if (confidence > 50) {
            labelDiv.style.backgroundColor = '#fff3e0';
            labelDiv.style.borderLeft = '3px solid #f57c00';
        } else {
            labelDiv.style.backgroundColor = '#ffebee';
            labelDiv.style.borderLeft = '3px solid #c62828';
        }
    }

    displayObjectDetection(data) {
        this.classificationResults.style.display = 'none';
        this.detectionResults.style.display = 'block';
        this.canvas.style.display = 'block';

        const detectionList = document.getElementById('detectionList');
        detectionList.innerHTML = '';

        data.bounding_boxes.forEach((bbox, index) => {
            const confidence = (bbox.confidence * 100).toFixed(1);
            const item = document.createElement('div');
            item.style.cssText = 'padding: 6px; background-color: #e3f2fd; margin-bottom: 4px; border-radius: 3px; border-left: 3px solid #1976d2;';
            item.innerHTML = `
                <div style="font-weight: bold; color: #1565c0;">${bbox.label}</div>
                <div style="font-size: 11px; color: #666;">
                    Confidence: ${confidence}%
                    <br>Position: (${bbox.x}, ${bbox.y}) Size: ${bbox.width}×${bbox.height}
                </div>
            `;
            detectionList.appendChild(item);
        });
    }

    updatePlaceholder(show, text = 'No Threatful Situations have been detected') {
        let placeholder = document.getElementById('aiPlaceholder');
        if (!placeholder && this.feedContainer) {
            placeholder = document.createElement('div');
            placeholder.id = 'aiPlaceholder';
            placeholder.style.cssText = `
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                background-color: #05070a; color: #64748b; font-size: 24px;
                text-align: center; padding: 40px; z-index: 5; font-weight: bold;
                border: 2px dashed #1e293b; border-radius: 50px; box-sizing: border-box;
            `;
            this.feedContainer.appendChild(placeholder);
            this.feedContainer.style.position = 'relative';
        }
        if (placeholder) {
            placeholder.style.display = show ? 'flex' : 'none';
            placeholder.textContent = text;
        }
    }

    drawBoundingBoxes(data) {
        if (!this.canvas || !this.ctx || !data.bounding_boxes || data.bounding_boxes.length === 0) {
            return;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Get image dimensions for scaling
        const imgWidth = this.feedImg.width;
        const imgHeight = this.feedImg.height;
        const scaleX = this.canvas.width / imgWidth;
        const scaleY = this.canvas.height / imgHeight;

        // Define colors for different classes
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33', '#FF8C33', '#33FFF5'];

        // Draw each bounding box
        data.bounding_boxes.forEach((bbox, index) => {
            const color = colors[index % colors.length];
            const x = bbox.x * scaleX;
            const y = bbox.y * scaleY;
            const width = bbox.width * scaleX;
            const height = bbox.height * scaleY;
            const confidence = (bbox.confidence * 100).toFixed(1);

            // Draw rectangle
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, width, height);

            // Draw label background
            const label = `${bbox.label} ${confidence}%`;
            this.ctx.font = 'bold 14px Arial';
            const metrics = this.ctx.measureText(label);
            const labelHeight = 20;
            const labelWidth = metrics.width + 10;

            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

            // Draw label text
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(label, x + 5, y - labelHeight + 2);
        });
    }

    updateFeedStatus(status, connected) {
        this.feedStatus.textContent = status;
        this.feedStatus.style.color = connected ? '#2e7d32' : '#c62828';
    }

    triggerInference() {
        fetch('/api/inference-trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
            console.log('Inference triggered:', data);
        })
        .catch(error => console.error('Error triggering inference:', error));
    }
}

// Initialize when page is ready
document.addEventListener('DOMContentLoaded', () => {
    window.inferenceDisplay = new InferenceDisplay();
});

// Expose trigger function globally for HTML onclick handlers
function triggerAIInference() {
    if (window.inferenceDisplay) {
        window.inferenceDisplay.triggerInference();
    }
}
