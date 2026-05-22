import { setPageTitle } from '../helpers';
import '../styles/error-page.scss';

export default function NotFound() {
    setPageTitle("404");

    return (
        <section id="error404">
            <h1>404</h1>
            <h2>Page Not Found</h2>
            <p>The page you are looking for does not exist.</p>
        </section>
    )
}