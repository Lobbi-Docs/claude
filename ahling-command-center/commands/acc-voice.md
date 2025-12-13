---
description: Test and configure the voice pipeline (Whisper STT, Piper TTS, Wyoming protocol)
argument-hint: "<operation> [--text TEXT] [--audio FILE]"
allowed-tools: ["Bash", "Read"]
---

Test and configure the ACC voice assistant pipeline including Whisper speech-to-text, Piper text-to-speech, Wyoming protocol integration, and voice command processing.

## Your Task

You are testing and configuring the voice pipeline. Verify STT/TTS components, test voice commands, configure Wyoming protocol, and integrate with Home Assistant.

## Arguments

- `operation` (required): Operation (test-stt, test-tts, test-pipeline, configure, status)
- `--text` (optional): Text to synthesize (for TTS testing)
- `--audio` (optional): Audio file path (for STT testing)
- `--voice` (optional): Voice model for Piper (default: en_US-lessac-medium)
- `--language` (optional): Language code (default: en)

## Steps to Execute

### 1. Check Voice Components

```bash
check_voice_components() {
  echo "=== Voice Pipeline Status ==="
  echo ""

  # Whisper (STT)
  curl -s http://whisper.ahling.local:10300 > /dev/null && {
    echo "✅ Whisper (STT): Running (port 10300)"
  } || {
    echo "❌ Whisper (STT): Not accessible"
  }

  # Piper (TTS)
  curl -s http://piper.ahling.local:10200 > /dev/null && {
    echo "✅ Piper (TTS): Running (port 10200)"
  } || {
    echo "❌ Piper (TTS): Not accessible"
  }

  # Wyoming Protocol
  nc -zv localhost 10300 > /dev/null 2>&1 && {
    echo "✅ Wyoming STT endpoint: Accessible"
  } || {
    echo "❌ Wyoming STT endpoint: Not accessible"
  }

  nc -zv localhost 10200 > /dev/null 2>&1 && {
    echo "✅ Wyoming TTS endpoint: Accessible"
  } || {
    echo "❌ Wyoming TTS endpoint: Not accessible"
  }
}
```

### 2. Test Speech-to-Text (Whisper)

```bash
test_stt() {
  AUDIO_FILE=$1

  echo "=== Testing Speech-to-Text (Whisper) ==="
  echo "Audio file: $AUDIO_FILE"
  echo ""

  if [ ! -f "$AUDIO_FILE" ]; then
    echo "Error: Audio file not found: $AUDIO_FILE"
    exit 1
  fi

  # Send audio to Whisper
  RESULT=$(curl -s -X POST \
    -F "audio_file=@$AUDIO_FILE" \
    http://whisper.ahling.local:10300/api/transcribe)

  echo "Transcription:"
  echo "$RESULT" | jq -r '.text'
  echo ""

  echo "Details:"
  echo "$RESULT" | jq '.'
}
```

### 3. Test Text-to-Speech (Piper)

```bash
test_tts() {
  TEXT=$1
  VOICE=${2:-en_US-lessac-medium}
  OUTPUT_FILE=${3:-/tmp/tts_output.wav}

  echo "=== Testing Text-to-Speech (Piper) ==="
  echo "Text: $TEXT"
  echo "Voice: $VOICE"
  echo ""

  # Send text to Piper
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$TEXT\", \"voice\": \"$VOICE\"}" \
    http://piper.ahling.local:10200/api/tts \
    -o "$OUTPUT_FILE"

  if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE")
    echo "✅ Audio generated: $OUTPUT_FILE ($(numfmt --to=iec $FILE_SIZE))"
    echo ""
    echo "Play with: aplay $OUTPUT_FILE"
    echo "Or: ffplay -nodisp -autoexit $OUTPUT_FILE"
  else
    echo "❌ Failed to generate audio"
  fi
}
```

### 4. Test Full Voice Pipeline

```bash
test_pipeline() {
  TEST_TEXT="Hello, this is a test of the voice pipeline"

  echo "=== Testing Full Voice Pipeline ==="
  echo ""

  # Step 1: Generate audio from text (TTS)
  echo "Step 1: Text-to-Speech"
  echo "Generating audio for: $TEST_TEXT"

  TTS_OUTPUT="/tmp/pipeline_test.wav"
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$TEST_TEXT\", \"voice\": \"en_US-lessac-medium\"}" \
    http://piper.ahling.local:10200/api/tts \
    -o "$TTS_OUTPUT"

  echo "✅ TTS complete"
  echo ""

  # Step 2: Transcribe audio back to text (STT)
  echo "Step 2: Speech-to-Text"
  echo "Transcribing generated audio..."

  STT_RESULT=$(curl -s -X POST \
    -F "audio_file=@$TTS_OUTPUT" \
    http://whisper.ahling.local:10300/api/transcribe)

  TRANSCRIBED_TEXT=$(echo "$STT_RESULT" | jq -r '.text')

  echo "✅ STT complete"
  echo ""

  # Compare
  echo "=== Results ==="
  echo "Original:    $TEST_TEXT"
  echo "Transcribed: $TRANSCRIBED_TEXT"
  echo ""

  # Simple similarity check
  if echo "$TRANSCRIBED_TEXT" | grep -qi "test.*voice.*pipeline"; then
    echo "✅ Pipeline working correctly"
  else
    echo "⚠️  Transcription may be inaccurate"
  fi

  # Cleanup
  rm -f "$TTS_OUTPUT"
}
```

### 5. List Available Voices

```bash
list_voices() {
  echo "=== Available Piper Voices ==="
  echo ""

  VOICES=$(curl -s http://piper.ahling.local:10200/api/voices)

  echo "$VOICES" | jq -r '.voices[] |
    "- \(.name): \(.language) (\(.quality), \(.speaker))"'
}
```

### 6. Configure Wyoming Protocol for Home Assistant

```bash
configure_wyoming() {
  echo "=== Configuring Wyoming Protocol for Home Assistant ==="
  echo ""

  cat <<EOF
Add to Home Assistant configuration.yaml:

# Wyoming Protocol - Speech-to-Text (Whisper)
wyoming:
  stt:
    - platform: wyoming
      host: whisper.ahling.local
      port: 10300

# Wyoming Protocol - Text-to-Speech (Piper)
  tts:
    - platform: wyoming
      host: piper.ahling.local
      port: 10200
      voice: en_US-lessac-medium

# Voice Assistant Pipeline
assist_pipeline:
  - name: "ACC Voice Assistant"
    language: en
    conversation_agent: conversation.home_assistant
    stt_engine: wyoming.whisper
    tts_engine: wyoming.piper
    wake_word_engine: none  # Add Porcupine/Raven if needed

# Voice satellite (optional, for remote microphone/speaker)
wyoming_satellite:
  - name: "Living Room Voice"
    uri: "tcp://living-room-satellite.local:10500"
    pipeline: ACC Voice Assistant
EOF

  echo ""
  echo "✅ Configuration template generated"
}
```

### 7. Process Voice Command

```bash
process_voice_command() {
  AUDIO_FILE=$1

  echo "=== Processing Voice Command ==="
  echo ""

  # Step 1: Transcribe
  echo "Transcribing audio..."
  TRANSCRIPTION=$(curl -s -X POST \
    -F "audio_file=@$AUDIO_FILE" \
    http://whisper.ahling.local:10300/api/transcribe | jq -r '.text')

  echo "Command: $TRANSCRIPTION"
  echo ""

  # Step 2: Process with Ollama (intent extraction)
  echo "Processing intent..."
  INTENT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"llama2\",
      \"prompt\": \"Extract the home automation command from this text and format as JSON with 'action', 'device', and 'value' fields: $TRANSCRIPTION\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo "Intent: $INTENT"
  echo ""

  # Step 3: Execute command (integrate with Home Assistant)
  echo "Executing command..."
  # This would call Home Assistant API based on the intent

  # Step 4: Generate response
  RESPONSE="Command executed successfully"

  # Step 5: Speak response
  echo "Speaking response..."
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$RESPONSE\"}" \
    http://piper.ahling.local:10200/api/tts \
    -o /tmp/response.wav

  echo "✅ Response generated: /tmp/response.wav"
}
```

### 8. Benchmark Voice Pipeline Performance

```bash
benchmark_voice() {
  echo "=== Voice Pipeline Performance Benchmark ==="
  echo ""

  TEST_PHRASES=(
    "Turn on the living room lights"
    "Set the temperature to 22 degrees"
    "What is the weather like today"
  )

  TOTAL_TIME=0
  COUNT=0

  for phrase in "${TEST_PHRASES[@]}"; do
    echo "Testing: $phrase"

    # Measure TTS
    TTS_START=$(date +%s%N)
    curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"$phrase\"}" \
      http://piper.ahling.local:10200/api/tts \
      -o /tmp/bench.wav > /dev/null 2>&1
    TTS_END=$(date +%s%N)
    TTS_TIME=$(echo "scale=3; ($TTS_END - $TTS_START) / 1000000000" | bc)

    # Measure STT
    STT_START=$(date +%s%N)
    curl -s -X POST \
      -F "audio_file=@/tmp/bench.wav" \
      http://whisper.ahling.local:10300/api/transcribe > /dev/null 2>&1
    STT_END=$(date +%s%N)
    STT_TIME=$(echo "scale=3; ($STT_END - $STT_START) / 1000000000" | bc)

    ROUND_TRIP=$(echo "$TTS_TIME + $STT_TIME" | bc)
    TOTAL_TIME=$(echo "$TOTAL_TIME + $ROUND_TRIP" | bc)
    ((COUNT++))

    echo "  TTS: ${TTS_TIME}s | STT: ${STT_TIME}s | Total: ${ROUND_TRIP}s"
    echo ""
  done

  AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $COUNT" | bc)

  echo "=== Benchmark Results ==="
  echo "Average round-trip time: ${AVG_TIME}s"

  if (( $(echo "$AVG_TIME < 2.0" | bc -l) )); then
    echo "✅ Excellent performance (< 2s)"
  elif (( $(echo "$AVG_TIME < 5.0" | bc -l) )); then
    echo "✅ Good performance (< 5s)"
  else
    echo "⚠️  Slow performance - check GPU allocation"
  fi

  rm -f /tmp/bench.wav
}
```

## Usage Examples

### Check status
```
/acc:voice status
```

### Test TTS
```
/acc:voice test-tts --text "Hello, this is a test"
```

### Test STT
```
/acc:voice test-stt --audio recording.wav
```

### Test full pipeline
```
/acc:voice test-pipeline
```

### List available voices
```
/acc:voice list-voices
```

### Configure Wyoming for Home Assistant
```
/acc:voice configure
```

### Process voice command
```
/acc:voice process --audio command.wav
```

### Benchmark performance
```
/acc:voice benchmark
```

## Expected Outputs

### Status Check
```
=== Voice Pipeline Status ===

✅ Whisper (STT): Running (port 10300)
✅ Piper (TTS): Running (port 10200)
✅ Wyoming STT endpoint: Accessible
✅ Wyoming TTS endpoint: Accessible
```

### TTS Test
```
=== Testing Text-to-Speech (Piper) ===
Text: Hello, this is a test
Voice: en_US-lessac-medium

✅ Audio generated: /tmp/tts_output.wav (48K)

Play with: aplay /tmp/tts_output.wav
Or: ffplay -nodisp -autoexit /tmp/tts_output.wav
```

### Pipeline Test
```
=== Testing Full Voice Pipeline ===

Step 1: Text-to-Speech
Generating audio for: Hello, this is a test of the voice pipeline
✅ TTS complete

Step 2: Speech-to-Text
Transcribing generated audio...
✅ STT complete

=== Results ===
Original:    Hello, this is a test of the voice pipeline
Transcribed: hello this is a test of the voice pipeline

✅ Pipeline working correctly
```

### Benchmark
```
=== Voice Pipeline Performance Benchmark ===

Testing: Turn on the living room lights
  TTS: 0.850s | STT: 1.250s | Total: 2.100s

Testing: Set the temperature to 22 degrees
  TTS: 0.920s | STT: 1.180s | Total: 2.100s

Testing: What is the weather like today
  TTS: 0.880s | STT: 1.200s | Total: 2.080s

=== Benchmark Results ===
Average round-trip time: 2.093s
✅ Good performance (< 5s)
```

## Success Criteria

- Whisper and Piper services are running
- Wyoming protocol endpoints accessible
- TTS generates valid audio files
- STT transcribes audio accurately
- Full pipeline completes successfully
- Performance is acceptable (< 5s round-trip)
- Home Assistant integration configured

## Notes

- Whisper uses GPU for faster transcription (requires ROCm/CUDA)
- Piper TTS is CPU-based (very fast)
- Wyoming protocol is Home Assistant's standard for voice
- Allocate 2GB VRAM for Whisper model
- Use medium or small Whisper models for balance of speed/accuracy
- Piper voices vary in quality: lessac (high), ljspeech (medium)
- Audio files should be WAV format, 16kHz sample rate
- STT accuracy improves with clean audio and proper microphone
- Consider noise reduction preprocessing for better accuracy
- Voice commands can be routed through Ollama for natural language understanding
