import React, { Component, Fragment } from 'react'
import socket from '../socket';

import '../scss/main.scss';
import autobind from 'class-autobind';
import rensAlert from '../rensAlert/rensAlert';
import { withRouter } from 'react-router-dom';
import BSTitle from '../Components/BSTitle';

class Main extends Component {
    constructor(props) {
        super(props);
        autobind(this);

        this.state = {};
        this.copyPopupTimeout = null;
    }

    componentDidMount() {
        socket.onStateSwitch = () => {
            if (socket.state === "Settings") {
                this.props.history.push('/settings');
                return;
            }
            this.forceUpdate();
        }

        socket.emit('getNameData', { uid: socket.uid });
        socket.on('nameData', (data) => {
            this.setState({
                playerCode: data.code,
                username: data.me
            });
        });

        const joinCode = new URL(window.location.href).searchParams.get('code');
        if (joinCode != null) {
            socket.emit('getLobbyInfo', joinCode)
        }
        socket.on('lobbyInfo', (data) => {
            this.setState({ otherName: data.name });
        });

        socket.on('nameAccepted', (data) => {
            socket.setUid(data.uid);

            if (joinCode != null) {
                document.getElementById('code').value = joinCode;
                this.tryCode();
            }

            this.setState({
                playerCode: data.code,
                username: data.name
            });
        });

        socket.on('lobbyJoined', (data) => {
            this.setState({
                lobbyId: data.id,
                otherUsername: data.otherName,
                leader: data.leader
            });
        });

        socket.on('reconnectLobby', (data) => {
            this.setState({
                lobbyId: data.lobbyId,
                username: data.me,
                otherUsername: data.opponent,
                leader: data.leader
            });
        });

        socket.on('opponentLeft', () => {
            rensAlert.popup({
                title: "Oh no!",
                text: "Your opponent has disconnected 😭",
            });
        });

        socket.on('setupStarted', () => this.props.history.push('/setup'));

        this.getScoreOfUser();

        setTimeout(() => {
            if (sessionStorage.getItem('jwtoken')) {
                if (!this.state.playerCode) {
                    this.getUsernameFromToken();
                }
            }
        }, 1000);
    }

    componentWillUnmount() {
        socket.removeListeners();
        if (this.copyPopupTimeout) clearTimeout(this.copyPopupTimeout);
    }

    getUsernameFromToken() {
        const token = sessionStorage.getItem('jwtoken');

        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''))

        const username = JSON.parse(jsonPayload).sub;
        if (username) {
            socket.emit('inputUsername', username);
        }
    }

    getScoreOfUser() {
        if (!sessionStorage.getItem('jwtoken')) return;
        
        fetch(process.env.REACT_APP_API_URL + '/user/wins', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('jwtoken')
            }
        })
        .then(async res => {
            if (res.ok) {
                const wins = await res.json();
                this.setState({spWins: wins.sp, mpWins: wins.mp});
            } else if (res.status === 404) {
                rensAlert.popup({ title: 'Oh no!', text: 'The user connected to this token could not be found :(' });
            } else if (res.status === 500) {
                rensAlert.popup({ title: 'Oops!', text: 'Something went wrong on the server side, try again later!' });
            }
        });
    }

    submitUsername() {
        const name = document.getElementById('username').value.trimLeft().trimRight();
        if (!name || name.length < 4) {
            rensAlert.popup({
                title: 'Oopsie!',
                text: 'Please enter a username that is longer than 4 characters',
            });
            return;
        }
        if (name.length > 20) {
            rensAlert.popup({
                title: 'Oopsie!',
                text: 'Please enter a username that is shorter than 20 characters',
            });
            return;
        }
        socket.emit('inputUsername', document.getElementById('username').value);
    }

    tryCode() {
        socket.emit('tryCode', document.getElementById('code').value);
    }

    emitStart() {
        socket.emit('startSetup', { id: this.state.lobbyId });
    }

    playSinglePlayer() {
        socket.emit('singlePlayerSettings', { uid: socket.uid });
    }

    async onCodeClick() {
        await navigator.clipboard.writeText(
            `${window.location.protocol}//${window.location.host}/?code=${this.state.playerCode}`
        );

        document.querySelector('.copyPopup').classList.add('visible');
        this.copyPopupTimeout = setTimeout(() => {
            const copyPopup = document.querySelector('.copyPopup');
            if (copyPopup) copyPopup.classList.remove('visible');
        }, 2000);
    }

    getCurrentView() {
        switch (socket.state) {
            case "EnterName":
                const joinCode = new URL(window.location.href).searchParams.get('code');
                return (
                    <Fragment>
                        <BSTitle/>
                        <div>
                        {joinCode ? <h2>Enter a username to join {this.state.otherName}'s lobby!</h2> : <h2>Enter your desired username!</h2>}
                        <input type="text" id="username" autoComplete="off" data-lpignore="true" minLength="4" maxLength="20" size="20" onKeyDown={(k) => k.key === 'Enter' ? this.submitUsername() : null}></input>
                        <button onClick={this.submitUsername}>Submit</button>
                        <div className="divider">
                            <hr />
                            <h3>OR</h3>
                        </div>
                        <button onClick={() => this.props.history.push('/login')}>Sign In</button>
                        <a href={'/documentation'}>API Documentation</a>
                    </div>
                    </Fragment>
                );
            case "Available":
                return (
                    <Fragment>
                        <div className="top">
                            <div>
                                <h1>Hey, {this.state.username}!</h1>
                                {this.state.spWins !== null && this.state.spWins !== undefined ? 
                                <h3>You have won <span className="colorful">{this.state.spWins}</span> singleplayer and <span className="colorful">{this.state.mpWins}</span> multiplayer games so far</h3> : ''}
                            </div>
                            <h2>
                                Your code is: <span className="code" onClick={this.onCodeClick}>{this.state.playerCode}</span>
                                <div className="copyPopup"><p>Code copied to clipboard</p></div>
                            </h2>

                            <button className="singlePlayer" onClick={this.playSinglePlayer}>Singleplayer</button>
                        </div>
                        <div>
                            <h2>Or enter a friend's code here</h2>
                            <input type="text" id="code" autoComplete="off" onKeyDown={(k) => k.key === 'Enter' ? this.tryCode() : null}></input>
                            <button onClick={this.tryCode}>Try Code</button>
                        </div>
                    </Fragment>
                );
            case "Lobby":
                return (
                    <div className="lobby">
                        <h1>You are connected to {this.state.otherUsername}!</h1>

                        {this.state.leader ? <button onClick={this.emitStart}>Start Game</button> : null}
                    </div>
                );
            case "OpponentReconnecting":
                return <h1>Your opponent is reconnecting... <span role="img" aria-label="ANXIOUS!">😰</span></h1>;
            default:
                return <h1>Oopsie whoopsie, unknown state <span role="img" aria-label="SAD!">😔</span></h1>;
        }
    }

    render() {
        return (
            <div className="main-page">
                {this.getCurrentView()}
            </div>
        );
    }
}

export default withRouter(Main);