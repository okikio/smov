/* eslint-disable no-console */
import { type SubtitleData, searchSubtitles } from "wyzie-lib";

import { CaptionListItem, PlayerMeta } from "@/stores/player/slices/source";

// Helper function to convert language names to language codes
function labelToLanguageCode(languageName: string): string {
  const languageMap: Record<string, string> = {
    English: "en",
    Spanish: "es",
    French: "fr",
    German: "de",
    Italian: "it",
    Portuguese: "pt",
    Russian: "ru",
    Japanese: "ja",
    Korean: "ko",
    Chinese: "zh",
    Arabic: "ar",
    Hindi: "hi",
    Turkish: "tr",
    Dutch: "nl",
    Polish: "pl",
    Swedish: "sv",
    Norwegian: "no",
    Danish: "da",
    Finnish: "fi",
    Greek: "el",
    Hebrew: "he",
    Thai: "th",
    Vietnamese: "vi",
    Indonesian: "id",
    Malay: "ms",
    Filipino: "tl",
    Ukrainian: "uk",
    Romanian: "ro",
    Czech: "cs",
    Hungarian: "hu",
    Bulgarian: "bg",
    Croatian: "hr",
    Serbian: "sr",
    Slovak: "sk",
    Slovenian: "sl",
    Estonian: "et",
    Latvian: "lv",
    Lithuanian: "lt",
    Icelandic: "is",
    Maltese: "mt",
    Georgian: "ka",
    Armenian: "hy",
    Azerbaijani: "az",
    Kazakh: "kk",
    Kyrgyz: "ky",
    Uzbek: "uz",
    Tajik: "tg",
    Turkmen: "tk",
    Mongolian: "mn",
    Persian: "fa",
    Urdu: "ur",
    Bengali: "bn",
    Tamil: "ta",
    Telugu: "te",
    Marathi: "mr",
    Gujarati: "gu",
    Kannada: "kn",
    Malayalam: "ml",
    Punjabi: "pa",
    Sinhala: "si",
    Nepali: "ne",
    Burmese: "my",
    Khmer: "km",
    Lao: "lo",
    Tibetan: "bo",
    Uyghur: "ug",
    Kurdish: "ku",
    Pashto: "ps",
    Dari: "prs",
    Sindhi: "sd",
    Kashmiri: "ks",
    Dogri: "doi",
    Konkani: "kok",
    Manipuri: "mni",
    Bodo: "brx",
    Sanskrit: "sa",
    Santhali: "sat",
    Maithili: "mai",
    Bhojpuri: "bho",
    Awadhi: "awa",
    Chhattisgarhi: "hne",
    Magahi: "mag",
    Rajasthani: "raj",
    Malvi: "mup",
    Bundeli: "bns",
    Bagheli: "bfy",
    Pahari: "phr",
    Kumaoni: "kfy",
    Garhwali: "gbm",
    Kangri: "xnr",
  };

  return languageMap[languageName] || languageName.toLowerCase();
}

export async function scrapeWyzieCaptions(
  tmdbId: string | number,
  imdbId: string,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    const searchParams: any = {
      encoding: "utf-8",
      source: "all",
      imdb_id: imdbId,
    };

    if (tmdbId && !imdbId) {
      searchParams.tmdb_id =
        typeof tmdbId === "string" ? parseInt(tmdbId, 10) : tmdbId;
    }

    if (season && episode) {
      searchParams.season = season;
      searchParams.episode = episode;
    }

    console.log("Searching Wyzie subtitles with params:", searchParams);
    const wyzieSubtitles: SubtitleData[] = await searchSubtitles(searchParams);

    const wyzieCaptions: CaptionListItem[] = wyzieSubtitles.map((subtitle) => ({
      id: subtitle.id,
      language: subtitle.language,
      url: subtitle.url,
      type:
        subtitle.format === "srt" || subtitle.format === "vtt"
          ? subtitle.format
          : "srt",
      needsProxy: false,
      opensubtitles: true,
      // Additional metadata from Wyzie
      display: subtitle.display,
      media: subtitle.media,
      isHearingImpaired: subtitle.isHearingImpaired,
      source: `wyzie ${subtitle.source.toString() === "opensubtitles" ? "opensubs" : subtitle.source}`,
      encoding: subtitle.encoding,
    }));

    return wyzieCaptions;
  } catch (error) {
    console.error("Error fetching Wyzie subtitles:", error);
    return [];
  }
}

export async function scrapeOpenSubtitlesCaptions(
  imdbId: string,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    const url = `https://rest.opensubtitles.org/search/${
      season && episode ? `episode-${episode}/` : ""
    }imdbid-${imdbId.slice(2)}${season && episode ? `/season-${season}` : ""}`;

    const response = await fetch(url, {
      headers: {
        "X-User-Agent": "VLSub 0.10.2",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenSubtitles API returned ${response.status}`);
    }

    const data = await response.json();
    const openSubtitlesCaptions: CaptionListItem[] = [];

    for (const caption of data) {
      const downloadUrl = caption.SubDownloadLink.replace(".gz", "").replace(
        "download/",
        "download/subencoding-utf8/",
      );
      const language = labelToLanguageCode(caption.LanguageName);

      if (!downloadUrl || !language) continue;

      openSubtitlesCaptions.push({
        id: downloadUrl,
        language,
        url: downloadUrl,
        type: caption.SubFormat || "srt",
        needsProxy: false,
        opensubtitles: true,
        source: "opensubs", // shortened becuase used on CaptionView for badge
      });
    }

    return openSubtitlesCaptions;
  } catch (error) {
    console.error("Error fetching OpenSubtitles:", error);
    return [];
  }
}

export async function scrapeFebboxCaptions(
  imdbId: string,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    let url: string;
    if (season && episode) {
      url = `https://fed-subs.pstream.mov/tv/${imdbId}/s${season}/e${episode}`;
    } else {
      url = `https://fed-subs.pstream.mov/movie/${imdbId}`;
    }

    // console.log("Searching Febbox subtitles with URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Febbox API returned ${response.status}`);
    }

    const data = await response.json();

    // Check for error response
    if (data.error) {
      console.log("Febbox API error:", data.error);
      return [];
    }

    // Check if subtitles exist
    if (!data.subtitles || typeof data.subtitles !== "object") {
      console.log("No subtitles found in Febbox response");
      return [];
    }

    const febboxCaptions: CaptionListItem[] = [];

    // Iterate through all available languages
    for (const [languageName, subtitleData] of Object.entries(data.subtitles)) {
      if (typeof subtitleData === "object" && subtitleData !== null) {
        const subtitle = subtitleData as {
          subtitle_link: string;
          subtitle_name: string;
        };

        if (subtitle.subtitle_link) {
          const language = labelToLanguageCode(languageName);
          const fileExtension = subtitle.subtitle_link
            .split(".")
            .pop()
            ?.toLowerCase();

          // Determine subtitle type based on file extension
          let type: string = "srt";
          if (fileExtension === "vtt") {
            type = "vtt";
          } else if (fileExtension === "sub") {
            type = "sub";
          }

          febboxCaptions.push({
            id: subtitle.subtitle_link,
            language,
            url: subtitle.subtitle_link,
            type,
            needsProxy: false,
            opensubtitles: true,
            display: subtitle.subtitle_name,
            source: "febbox",
          });
        }
      }
    }

    console.log(`Found ${febboxCaptions.length} Febbox subtitles`);
    return febboxCaptions;
  } catch (error) {
    console.error("Error fetching Febbox subtitles:", error);
    return [];
  }
}

export async function scrapeExternalSubtitles(
  meta: PlayerMeta,
): Promise<CaptionListItem[]> {
  try {
    // Extract IMDb ID from meta
    const imdbId = meta.imdbId;
    if (!imdbId) {
      console.log("No IMDb ID available for external subtitle scraping");
      return [];
    }

    const season = meta.season?.number;
    const episode = meta.episode?.number;
    const tmdbId = meta.tmdbId;

    // Fetch Wyzie, OpenSubtitles, and Febbox captions (no timeouts to allow all to complete)
    const [wyzieCaptions, openSubsCaptions, febboxCaptions] =
      await Promise.allSettled([
        scrapeWyzieCaptions(tmdbId, imdbId, season, episode),
        scrapeOpenSubtitlesCaptions(imdbId, season, episode),
        scrapeFebboxCaptions(imdbId, season, episode),
      ]);

    const allCaptions: CaptionListItem[] = [];

    // Handle Promise.allSettled results
    const wyzieResult =
      wyzieCaptions.status === "fulfilled" ? wyzieCaptions.value : [];
    const openSubsResult =
      openSubsCaptions.status === "fulfilled" ? openSubsCaptions.value : [];
    const febboxResult =
      febboxCaptions.status === "fulfilled" ? febboxCaptions.value : [];

    allCaptions.push(...wyzieResult, ...openSubsResult, ...febboxResult);

    console.log(
      `Found ${allCaptions.length} external captions (Wyzie: ${wyzieResult.length}, OpenSubtitles: ${openSubsResult.length}, Febbox: ${febboxResult.length})`,
    );

    return allCaptions;
  } catch (error) {
    console.error("Error in scrapeExternalSubtitles:", error);
    return [];
  }
}
