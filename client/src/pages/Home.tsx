import profilePic from "../assets/Pfp.jpg";

export default function Home() {
    return (
        <>
            <section className="hero-section">
                <div className="bio-container">
                    <div className="bio-content">
                        <h1 className="name">Hi,<br/>I am<br/>NateThePlot</h1>
                        <h3>I'm Nate — NateThePlot across all Socials. The plot in question has not yet been located.</h3>
                        <h3>I love writing in many different genres of story; typically Sci-fi and Fantasy. I go where the story takes me, no real plan in sight.</h3>
                        <h3>I have dozens of ongoing projects scattered across many docs. Short stories, novellas, and one or two novels lurking in the shadows.</h3>
                        <h3>If any of that sounds like your kind of chaos, you're in the right place.</h3>
                    </div>
                    <img src={profilePic} alt="Profile Picture" className="profile-pic" />
                </div>
            </section>

            <section id="stories">
                <h2>Featured Stories</h2>
                <p>Step into the worlds I build, one chapter at a time. A collection of sci-fi and fantasy shorts for the curious traveller.</p>
                <ul className="story-list">
                    <li>
                        <div>
                            <span className="story-title">Coming Soon</span>
                            <p className="story-description">Check back soon for more stories!</p>
                            <span className="read-story">Coming Soon</span>
                        </div>
                    </li>
                    <li>
                        <div>
                            <span className="story-title">Coming Soon</span>
                            <p className="story-description">Check back soon for more stories!</p>
                            <span className="read-story">Coming Soon</span>
                        </div>
                    </li>
                    <li>
                        <div>
                            <span className="story-title">Coming Soon</span>
                            <p className="story-description">Check back soon for more stories!</p>
                            <span className="read-story">Coming Soon</span>
                        </div>
                    </li>
                </ul>
            </section>

            <section id="stories" style={{ justifyItems: "center", textAlign: "center", display: "grid" }}>
                <h2>All Stories</h2>
                <p>Explore the complete collection of my published works or start reading from the featured selection above.</p>
                <a href="/library" className="library-link">Browse Full Library</a>
            </section>
        </>
    );
}