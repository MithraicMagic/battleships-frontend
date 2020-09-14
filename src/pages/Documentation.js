
import React, { Component } from 'react'
import DocPath from '../Components/DocPath';
import '../scss/documentation.scss';

export default class Documentation extends Component {
    constructor(props) {
        super(props);

        this.state = {
            paths: []
        };
    }

    async componentDidMount() {
        const result = await fetch(process.env.REACT_APP_API_URL + '/documentation');
        if (result.ok) {
            const docs = await result.json();

            const paths = [];
            docs.forEach((p, i) => {
                paths.push(<DocPath key={i} doc={p}/>)
            });

            this.setState({ paths });
        }

        const elements = document.querySelectorAll('.event');
        elements.forEach(el => {
            el.addEventListener('click', (e) => {
                elements.forEach(ele => {
                    if (ele !== el) {
                        ele.classList.add('hidden');
                    }
                });
                e.currentTarget.classList.toggle('hidden');
            });
        });
    }

    render() {
        return (
            <div className="documentation">
                <div className="events">
                    {this.state.paths}
                </div>
            </div>
        )
    }
}
