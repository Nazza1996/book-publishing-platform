import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle } from "../helpers";

export default function Home() {
    const [featuredBooks, setFeaturedBooks] = useState<any[]>([]);

    setPageTitle("");

    useEffect(() => {
        async function fetchFeaturedBooks() {
            const response = await apiFetch('/api/books/featured');
            const data = await response.json();

            for (let i = data.length; i < 3; i++) {
                if (data[i] == null) {
                    data.push({ title: "Placeholder" });
                }
            }

            setFeaturedBooks(data);
        }

        fetchFeaturedBooks();
    }, []);

    return (
        <>
            <section id="stories">
                <h2>Featured Stories</h2>
                <ul className="story-list">
                    {Array.isArray(featuredBooks) ? featuredBooks.map((book, index) => (
                        book.title == "Placeholder" ? <ComingSoon key={index} /> : <FeaturedBookCard key={index} book={book} />
                    )) : 
                        <>
                            <ComingSoon />
                            <ComingSoon />
                            <ComingSoon />
                        </>
                    }
                </ul>
            </section>

            <section id="stories" style={{ justifyItems: "center", textAlign: "center", display: "grid" }}>
                <h2>All Stories</h2>
                <p>Explore the complete collection of released works or start reading from the featured selection above.</p>
                <Link to="/library" className="library-link">Browse Full Library</Link>
            </section>
        </>
    );
}

const ComingSoon = () => (
    <li>
        <div>
            <span className="story-title">Coming Soon</span>
            <p className="story-description">Check back soon for more stories!</p>
            <span className="read-story">Coming Soon</span>
        </div>
    </li>
)

const FeaturedBookCard = ({ book }: { book: any }) => (
    <li>
        <Link to={`/book/${book.slug ?? book.id}`}>
            <span className="story-title">{book.title}</span>
            <p className="story-description">
                {book.description}
            </p>
            <span className="read-story">Read Story</span>
        </Link>
    </li>
)
