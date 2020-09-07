import io from 'socket.io-client';
import RensAlert from './rensAlert/rensAlert';
import { NON_TIMED, DEFAULT_STYLE } from './rensAlertStyles';

class Socket {
    constructor() {
        this.socket = io(process.env.REACT_APP_URL, { path: '/sockets' });
        this.uid = sessionStorage.getItem('userId');
        
        this.state = "EnterName";
        this.onStateSwitch = null;
        this.onStateSwitchTaunt = null;

        this.username = "";
        this.opponent = "";

        this.listeners = [];
        this.init();
    }

    init() {
        this.socket.on('newUid', (data) => sessionStorage.setItem('userId', data.data));

        this.socket.on('message');
        this.socket.on('errorEvent', (data) => {
            RensAlert.popup({
                title: 'Oopsie!',
                text: data.reason,
                style: {
                    top: '-80px',
                    right: '20px',
                    transition: '0.3s all ease-out',
                    opacity: '0'
                },
                transition: {
                    time: 5000,
                    style: {
                        top: '25px',
                        opacity: '1'
                    }
                }
            });
        });

        this.socket.on('opponentReconnected', () => {
            RensAlert.popup({
                title: 'Yay!',
                text: 'Your opponent is back!',
                ...DEFAULT_STYLE
            });
        });

        this.socket.on('playerState', (state) => {
            this.state = state;
            if (this.onStateSwitch) this.onStateSwitch();
            if (this.onStateSwitchTaunt) this.onStateSwitchTaunt();
        });

        this.socket.emit('lastUid', this.uid);
    }

    setUid(uid) {
        this.uid = uid;
        sessionStorage.setItem('userId', this.uid);
    }

    emit(msg, ...data) {
        if (process.env.REACT_APP_DEBUG === 'true') {
            const lg = `[SOCKET] Emitting '${msg}'` + (process.env.REACT_APP_LOG_PAYLOAD === 'true' ? ` with payload: ${JSON.stringify(data)}` : '');
            console.log(lg);
        }
        this.socket.emit(msg, ...data);
    }

    on(msg, func) {
        this.listeners.push({ event: msg, func });

        this.socket.on(msg, (...data) => {
            if (process.env.REACT_APP_DEBUG === 'true') {
                const lg = `[SOCKET] Receiving '${msg}'` + (process.env.REACT_APP_LOG_PAYLOAD === 'true' ? ` with payload: ${JSON.stringify(data)}` : '');
                console.log(lg);
            }
            if (func) {
                data.forEach((d) => {
                    const username = Object.entries(d).find(([key, value]) => key === "me");
                    const opponent = Object.entries(d).find(([key, value]) => key === "opponent" || key === "otherName");

                    if (username) this.username = username[1];
                    if (opponent) this.opponent = opponent[1];
                });

                func(...data);
            }
        });
    }

    submitLeave(lobbyId) {
        RensAlert.confirm({
            title: "Are you sure",
            text: "That you want to leave the lobby?",
            accept: "Yes",
            decline: "No",
            onAccept: () => {
                this.socket.emit('leaveLobby', { uid: this.uid, lobbyId });
            }, ...NON_TIMED
        });
    }

    removeListeners() {
        this.listeners.forEach((l) => {
            this.socket.off(l.event);
        });

        this.listeners = [];
    }
}

const socket = new Socket();
export default socket;