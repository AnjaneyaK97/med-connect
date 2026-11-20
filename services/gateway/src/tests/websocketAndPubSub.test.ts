import { EventBroker, MediConnectEvent } from '../services/eventBroker';

describe('Phase 6: WebSocket Gateway & Redis Pub/Sub Event Broker', () => {
  it('dispatches and receives cluster events through EventBroker', (done) => {
    const testSessionId = 'sess-ws-999';
    const testPayload = {
      progress: 60,
      status: 'TRANSCRIBING',
      sessionId: testSessionId,
    };

    EventBroker.onEvent((event: MediConnectEvent) => {
      if (event.event === 'transcription_progress' && event.payload.sessionId === testSessionId) {
        expect(event.payload.progress).toBe(60);
        expect(event.payload.status).toBe('TRANSCRIBING');
        expect(event.room).toBe(`session:${testSessionId}`);
        expect(event.timestamp).toBeDefined();
        done();
      }
    });

    EventBroker.publish('transcription_progress', testPayload, `session:${testSessionId}`);
  });

  it('broadcasts urgent red-flag safety alerts across cluster to doctor queues', (done) => {
    const urgentAlert = {
      sessionId: 'sess-emergency-01',
      patientName: 'John Doe',
      condition: 'Acute Myocardial Infarction',
      severity: 'EMERGENCY',
      timestamp: new Date().toISOString(),
    };

    EventBroker.onEvent((event: MediConnectEvent) => {
      if (event.event === 'urgent_flag' && event.payload.sessionId === 'sess-emergency-01') {
        expect(event.payload.severity).toBe('EMERGENCY');
        expect(event.room).toBe('role:DOCTOR');
        done();
      }
    });

    EventBroker.publish('urgent_flag', urgentAlert, 'role:DOCTOR');
  });

  it('formats doctor-patient chat consultation messages with sender identity', (done) => {
    const chatMsg = {
      roomId: 'room-apt-55',
      senderId: 'doc-123',
      message: 'Hello, I have reviewed your triage summary. How are you feeling now?',
    };

    EventBroker.onEvent((event: MediConnectEvent) => {
      if (event.event === 'chat_message' && event.payload.roomId === 'room-apt-55') {
        expect(event.payload.message).toContain('reviewed your triage summary');
        expect(event.senderId).toBe('doc-123');
        done();
      }
    });

    EventBroker.publish('chat_message', chatMsg, `room:${chatMsg.roomId}`, 'doc-123');
  });
});
