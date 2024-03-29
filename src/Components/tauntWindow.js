
import React, { Component } from 'react'
import RensAlert from '../rensAlert/rensAlert';

import '../scss/taunt.scss';
import autobind from 'class-autobind';
import { MESSAGE_STYLE } from '../rensAlertStyles';
import socket from '../socket';
import Message from './Message';

const State = { DOWN: 0, UP: 1 };
const InvisibleStates = [ "None", "EnterName", "Available", "Settings" ];

function buildDate(time) {
    const d = new Date();
    d.setHours(time.hour);
    d.setMinutes(time.minute);
    d.setSeconds(time.second);
    return d;
}

export default class tauntWindow extends Component {
    constructor(props) {
        super(props);
        autobind(this);
    
        this.state = {
            current: State.DOWN,
            messages: [],
            getMessagesEmitted: false
        };
    }

    componentDidMount() {
        socket.onStateSwitchTaunt = this.onStateSwitch;
        this.onStateSwitch();

        socket.socket.on('messages', (data) => {
            const messages = [];
            data.messages.forEach((m, index) => {
                messages.push(<Message key={index} message={m.message} time={m.time} sent={socket.username === m.sender}/>);
            });
            
            messages.sort((a, b) => buildDate(a.props.time) - buildDate(b.props.time));
            this.setState({ messages });
        });

        socket.socket.on('messageReceived', (m) => {
            RensAlert.popup({ 
                title: `Message from ${socket.opponent}`,
                text: m.message,
            }, MESSAGE_STYLE);
            const messages = this.state.messages;
            messages.push(<Message key={"r" + Math.random()} message={m.message} time={m.time} sent={false}/>);

            this.onAddMessage(messages);
        });
    }

    onAddMessage(messages) {
        if (messages.length > 20) messages.splice(0, 1);

        this.setState({ messages }, () => this.scrollDown());
    }

    scrollDown() {
        const m = document.querySelector('.messages');
        m.scrollTop = m.scrollHeight;
    }

    onStateSwitch() {
        const tauntWindow = document.querySelector('.tauntWindow');
        if (InvisibleStates.includes(socket.state)) {
            tauntWindow.classList.add('hidden');
        }
        else {
            tauntWindow.classList.remove('hidden');
            if (!this.state.getMessagesEmitted) {
                socket.emit('getMessages', { uid: socket.uid });
                this.setState({ getMessagesEmitted: true });
            }
        }
    }

    changeTo(state) {
        if (this.state.current === state) return;

        document.querySelector('.tauntWindow').classList.toggle('extended');
        this.setState({ current: state });
    }

    sendMessage(e) {
        e.preventDefault();

        const textBox = document.querySelector('form .tauntText');
        const msg = textBox.value;
        if (msg.length < 3 || msg.length > 100) {
            RensAlert.popup({
                title: 'Oops',
                text: 'Your message should be between 3 and 100 characters',
            });
            return;
        } 

        socket.emit('sendMessage', { lobbyId: this.props.lobbyId, uid: socket.uid, message: msg });
        const messages = this.state.messages;
        messages.push(<Message key={"s" + Math.random()} message={msg} time={new Date().toTimeString()} sent={true}/>);
        
        textBox.value = "";
        this.onAddMessage(messages);
    }

    render() {
        return (
            <div className="tauntWindow" onClick={() => this.changeTo(State.UP)}>
                <div className="close" onClick={() => this.changeTo(State.DOWN)}><span>Close</span></div>
                <div className="open">Click to Taunt</div>

                <div className="messages">
                    {this.state.messages}
                </div>

                <form onSubmit={this.sendMessage}>
                    <input className="tauntText" type="text" placeholder="Taunt your opponent"/>
                    <input type="submit" value="Send" autoComplete="off" data-lpignore="true"/>
                </form>
            </div>
        )
    }
}
